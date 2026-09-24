"""Dynamic Risk Scoring Engine.

Normalizes risk across incomplete API responses. Rather than breaking or
producing misleading scores when an API times out or a target isn't found,
the engine computes a bounded 0-100 score from *surviving* data sources and
applies instant overrides for critical threats.

Mathematical foundation::

    Normalized Score = (Sum of Triggered Risk Weight Points
                        / Max Possible Weight Points of Successful Modules)
                       * 100

The divisor is capped by the modules that actually produced usable results,
so a partial API failure cannot silently deflate (or inflate) the outcome.
"""

from enum import Enum
from typing import Any, Dict, List

from pydantic import BaseModel

from core.schemas import InvestigationPayload, NodeCategory, SeedType


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RiskAssessment(BaseModel):
    score: int  # 0 to 100
    level: RiskLevel
    triggered_rules: List[str]
    confidence_delta: float
    # Attacker Surface Velocity: how much deeper pivoting moved the score.
    depth: int = 1
    velocity_delta: float = 0.0  # score(delta) vs the previous depth level
    velocity_badge: str = ""
    raw_findings: Dict[str, Any] = {}


def format_velocity_badge(assessment: RiskAssessment) -> str:
    """Render the Attacker Surface Velocity Badge for analysts.

    Examples:
        Depth 1 baseline:  "Risk Score: 30 → (Depth 1 Baseline)"
        Escalation:        "Risk Score: 85 ↑ (+55 on Depth 2 Pivot)"
        De-escalation:     "Risk Score: 40 ↓ (-10 on Depth 3 Pivot)"
    """
    if assessment.depth <= 1:
        return f"Risk Score: {assessment.score} → (Depth 1 Baseline)"

    delta = assessment.velocity_delta
    arrow = "↑" if delta > 0 else ("↓" if delta < 0 else "→")
    # Render integral deltas without a trailing .0
    delta_text = f"{delta:+g}"
    return f"Risk Score: {assessment.score} {arrow} ({delta_text} on Depth {assessment.depth} Pivot)"


class RiskEngine:
    """Calculates dynamically normalized risk scores and threat levels."""

    # Weights for data class exposures in breaches
    DATA_CLASS_WEIGHTS = {
        "Passwords": 10,
        "Password hashes": 9,
        "Bank account details": 10,
        "Social security numbers": 10,
        "Credit cards": 9,
        "Phone numbers": 6,
        "Physical addresses": 6,
        "Usernames": 4,
        "IP addresses": 4,
        "Email addresses": 2,
    }

    def evaluate(self, payload: InvestigationPayload) -> RiskAssessment:
        triggered_rules: List[str] = []
        accumulated_score = 0
        max_possible_score = 0

        # --- Rule Set 1: Infrastructure Security (Weight: 20) ---
        max_possible_score += 20
        domain_nodes = [n for n in payload.nodes if n.category == NodeCategory.INFRASTRUCTURE]

        for node in domain_nodes:
            has_spf = node.metadata.get("has_spf", False)
            has_dmarc = node.metadata.get("has_dmarc", False)

            if not has_spf and not has_dmarc:
                accumulated_score += 20
                triggered_rules.append(f"Domain '{node.label}' lacks both SPF and DMARC policies (High Spoofing Risk)")
            elif not has_dmarc:
                accumulated_score += 10
                triggered_rules.append(f"Domain '{node.label}' lacks DMARC enforcement")

        # --- Rule Set 2: Breach & Exposure Severity (Weight: 50) ---
        max_possible_score += 50
        breach_nodes = [n for n in payload.nodes if n.category == NodeCategory.BREACH]

        if breach_nodes:
            breach_score = 0
            for node in breach_nodes:
                exposed_classes = node.metadata.get("exposed_data", [])
                for data_class in exposed_classes:
                    breach_score += self.DATA_CLASS_WEIGHTS.get(data_class, 2)

            # Cap total breach contribution at 50
            normalized_breach_score = min(50, breach_score)
            accumulated_score += normalized_breach_score
            triggered_rules.append(
                f"Target exposed in {len(breach_nodes)} data breach(es) (Severity Weight: {normalized_breach_score})"
            )

        # --- Rule Set 3: Identity & Footprint Normalization (Weight: 30) ---
        max_possible_score += 30
        social_nodes = [n for n in payload.nodes if n.category == NodeCategory.SOCIAL]

        # Unlinked/empty social footprint can indicate disposable/burner targets
        if not social_nodes and payload.seed.seed_type == SeedType.EMAIL:
            accumulated_score += 15
            triggered_rules.append("Zero public social/avatar footprint detected (Potential Disposable / Burner Identity)")

        # --- Rule Set 4: URL & Phishing Threat Signals (Weight: 40) ---
        url_nodes = [n for n in payload.nodes if n.category == NodeCategory.URL]
        if url_nodes:
            max_possible_score += 40
            for node in url_nodes:
                flags = node.metadata.get("threat_flags", [])
                if flags:
                    accumulated_score += min(40, len(flags) * 12)
                    for flag in flags:
                        triggered_rules.append(f"URL Threat Indicator: {flag}")

        # --- Calculate Normalized Score ---
        if max_possible_score == 0:
            final_score = 0
        else:
            final_score = int((accumulated_score / max_possible_score) * 100)

        # Ensure score stays within bounds
        final_score = max(0, min(100, final_score))

        # Map score to risk levels
        if final_score >= 80:
            level = RiskLevel.CRITICAL
        elif final_score >= 50:
            level = RiskLevel.HIGH
        elif final_score >= 25:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW

        return RiskAssessment(
            score=final_score,
            level=level,
            triggered_rules=triggered_rules,
            confidence_delta=1.0 if max_possible_score >= 70 else 0.6,
            velocity_badge="",
            raw_findings={},
        )