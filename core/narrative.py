"""Universal Narrative Engine — Claude AI Summarization.

Generates analyst-grade intelligence summaries from InvestigationPayloads by
dispatching the full graph + risk assessment to an LLM endpoint (Ollama,
Claude, or any OpenAI-compatible API). Falls back to a deterministic
passive summarizer when no endpoint is reachable.

OpSec Upgrade: The engine calculates target_opsec_awareness based on domain
authentication policies (DMARC/BIMI presence) before calling the LLM, so
even the fallback summary carries an OpSec signal.
"""

import json
import logging
from typing import Optional

import httpx
from pydantic import BaseModel

from core.schemas import InvestigationPayload, NodeCategory
from core.risk_engine import RiskAssessment

logger = logging.getLogger("threatscope.narrative")


class IntelligenceSummary(BaseModel):
    """Structured output from the narrative engine."""

    executive_summary: str
    key_findings: list[str]
    pivot_opportunities: list[str]
    remediation_steps: list[str]
    target_opsec_awareness: str  # "HIGH", "MEDIUM", or "LOW"


class NarrativeEngine:
    """Universal Narrative Engine supporting Ollama, Cloud endpoints, or
    Passive Fallbacks.

    Parameters
    ----------
    base_url:
        OpenAI-compatible chat completions endpoint
        (default: ``http://localhost:11434/v1`` for local Ollama).
    api_key:
        Bearer token for the endpoint (default: ``"ollama"``).
    model:
        LLM model identifier (default: ``"llama3.2"``).
    """

    def __init__(
        self,
        base_url: str = "http://localhost:11434/v1",
        api_key: str = "ollama",
        model: str = "llama3.2",
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model

    # ------------------------------------------------------------------
    # OpSec assessment (computed before LLM call; always available)
    # ------------------------------------------------------------------

    def _assess_target_opsec(self, payload: InvestigationPayload) -> str:
        """Calculates OpSec awareness based on domain authentication policies.

        Scoring per infrastructure node:
        * ``has_dmarc`` AND ``has_bimi`` → +2  (robust protection)
        * ``has_dmarc`` only         → +1  (good protection)
        * ``has_spf`` only           → +0  (basic / weak protection)
        * nothing                    → +0  (unprotected)

        Aggregate across all infrastructure nodes:
        * total >= 2 → ``"HIGH"``
        * total == 1 → ``"MEDIUM"``
        * total == 0 → ``"LOW"``
        """
        high_sec_indicators = 0
        for node in payload.nodes:
            if node.category == NodeCategory.INFRASTRUCTURE:
                has_spf = node.metadata.get("has_spf", False)
                has_dmarc = node.metadata.get("has_dmarc", False)
                has_bimi = node.metadata.get("has_bimi", False)

                if has_dmarc and has_bimi:
                    high_sec_indicators += 2
                elif has_dmarc:
                    high_sec_indicators += 1
                # SPF-only contributes 0 (basic protection, still LOW/MEDIUM)

        if high_sec_indicators >= 2:
            return "HIGH"
        elif high_sec_indicators == 1:
            return "MEDIUM"
        return "LOW"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_summary(
        self, payload: InvestigationPayload, risk: RiskAssessment
    ) -> IntelligenceSummary:
        """Generate an intelligence summary for *payload* and *risk*.

        Tries the LLM endpoint first; falls back to a deterministic
        passive summarizer on any failure.
        """
        opsec_level = self._assess_target_opsec(payload)

        graph_summary = {
            "target_seed": f"{payload.seed.seed_type.value}:{payload.seed.value}",
            "risk_score": risk.score,
            "risk_level": risk.level.value,
            "opsec_awareness": opsec_level,
            "triggered_rules": risk.triggered_rules,
            "total_nodes": len(payload.nodes),
            "total_edges": len(payload.edges),
            "node_breakdown": [
                {
                    "canonical_id": n.canonical_id,
                    "category": n.category.value,
                    "label": n.label,
                    "metadata": n.metadata,
                }
                for n in payload.nodes
            ],
        }

        prompt = f"""
You are an expert Cyber Threat Intelligence analyst summarizing an OSINT investigation.
Analyze the following JSON graph payload and risk assessment for target '{payload.seed.value}'.

INVESTIGATION DATA:
{json.dumps(graph_summary, indent=2)}

Provide an analytical breakdown formatted strictly as a JSON object matching this schema:
{{
  "executive_summary": "A concise summary (2-3 sentences) explaining the target's risk posture.",
  "key_findings": ["Finding 1", "Finding 2"],
  "pivot_opportunities": ["Suggested next search vectors"],
  "remediation_steps": ["Actionable steps to remediate vulnerabilities"],
  "target_opsec_awareness": "{opsec_level}"
}}

Respond ONLY with valid JSON. Do not include markdown preamble or wrapper text.
"""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        body = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            # Note: response_format is omitted — Ollama doesn't support it.
            # The prompt already instructs the LLM to respond with pure JSON.
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=body,
                )

                if response.status_code == 200:
                    raw_content = response.json()["choices"][0]["message"]["content"]
                    # Strip markdown fences that Ollama/local LLMs sometimes wrap around JSON
                    cleaned = raw_content.strip()
                    if cleaned.startswith("```"):
                        # Remove opening fence (```json or ```)
                        cleaned = cleaned.split("\n", 1)[-1] if "\n" in cleaned else cleaned[3:]
                    if cleaned.endswith("```"):
                        cleaned = cleaned[:-3].rstrip()
                    parsed_data = json.loads(cleaned)
                    return IntelligenceSummary(**parsed_data)

        except Exception as e:
            logger.warning(f"Narrative engine fallback triggered: {str(e)}")

        # Deterministic Passive Fallback
        return IntelligenceSummary(
            executive_summary=(
                f"Target '{payload.seed.value}' presents a {risk.level.value} risk "
                f"score ({risk.score}/100) across {len(payload.nodes)} mapped graph "
                f"entities."
            ),
            key_findings=(
                risk.triggered_rules
                if risk.triggered_rules
                else ["No high-severity exposures detected."]
            ),
            pivot_opportunities=[
                f"Investigate canonical entity: {n.canonical_id}"
                for n in payload.nodes
                if n.canonical_id != f"{payload.seed.seed_type.value}:{payload.seed.value}"
            ],
            remediation_steps=[
                "Ensure domain SPF/DMARC policies are set to enforcement mode ('p=reject')."
            ],
            target_opsec_awareness=opsec_level,
        )
