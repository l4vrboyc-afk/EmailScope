"""Async Orchestrator Engine.

Coordinates parallel module execution, timeout isolation, and graph
synthesis for an ThreatScope investigation.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx

from core.schemas import (
    SeedInput,
    SeedType,
    InvestigationPayload,
    GraphNode,
    GraphEdge,
    NodeCategory,
)
from core.fetchers.base import BaseFetcher
from core.ratelimit import TokenBucket
from core.risk_engine import RiskEngine, RiskAssessment, format_velocity_badge

logger = logging.getLogger("threatscope.orchestrator")


class AsyncOrchestrator:
    """Coordinates parallel module execution, timeout isolation, and graph synthesis.

    All registered fetchers are dispatched concurrently, but flow through a
    shared :class:`TokenBucket` so their combined request rate never exceeds
    a safe ceiling — essential when 20+ third-party OSINT APIs (HIBP,
    VirusTotal, AbuseIPDB) are involved and a burst of recursive seeds could
    otherwise trip IP bans or HTTP 429 rate limits.
    """

    def __init__(
        self,
        fetchers: List[BaseFetcher],
        rate_per_second: float = 5.0,
        burst_capacity: int = 10,
    ):
        self.fetchers = fetchers
        self.rate_per_second = rate_per_second
        self.burst_capacity = burst_capacity
        # One global bucket throttles every module, across the whole scan.
        self._bucket = TokenBucket(rate=rate_per_second, capacity=burst_capacity)
        # Risk engine normalizes surviving signals into a 0-100 score.
        self._risk_engine = RiskEngine()

    async def run_investigation(self, seed: SeedInput) -> InvestigationPayload:
        """Run a depth-progressive investigation with Attacker Surface Velocity.

        Depth 1 sweeps the direct seed. Each deeper level *pivots*: entities
        discovered so far (breach domains, Gravatar link domains, ...) become
        new seeds for another fetcher sweep. Risk is re-evaluated on the
        cumulative graph after every depth, and the score movement between
        levels is recorded as ``velocity_delta`` — exposing critical threats
        that only deeper pivoting uncovers.
        """
        payload = InvestigationPayload(
            seed=seed,
            created_at=datetime.now(timezone.utc),
        )

        # Create the root seed node in the graph
        root_node = GraphNode(
            canonical_id=f"{seed.seed_type.value}:{seed.value}",
            category=self._map_seed_to_category(seed.seed_type),
            label=seed.value,
            metadata={"is_root_seed": True},
        )
        payload.nodes.append(root_node)
        root_canonical_id = root_node.canonical_id

        max_depth = max(1, seed.depth)
        swept: set = set()
        # (seed to sweep, canonical id of the node that surfaced it)
        frontier: List[Tuple[SeedInput, str]] = [(seed, root_canonical_id)]

        # If root seed is a URL, extract domain to sweep infrastructure modules
        if seed.seed_type == SeedType.URL:
            try:
                raw_url = seed.value if "://" in seed.value else f"https://{seed.value}"
                parsed = urlparse(raw_url)
                host = (parsed.hostname or "").strip().lower()
                if host:
                    frontier.append((SeedInput(value=host, seed_type=SeedType.DOMAIN, depth=seed.depth), root_canonical_id))
            except Exception:
                pass

        depth_history: List[Dict[str, Any]] = []
        previous_score: Optional[int] = None
        latest: Optional[RiskAssessment] = None

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            for depth in range(1, max_depth + 1):
                next_frontier: List[Tuple[SeedInput, str]] = []

                for pivot_seed, source_id in frontier:
                    pivot_canonical = f"{pivot_seed.seed_type.value}:{pivot_seed.value}"
                    if pivot_canonical in swept:
                        continue
                    swept.add(pivot_canonical)

                    # Concurrent, throttled, timeout-isolated module sweep
                    tasks = [
                        self._execute_fetcher_safely(fetcher, pivot_seed, client)
                        for fetcher in self.fetchers
                    ]
                    results = await asyncio.gather(*tasks)

                    for fetcher_name, result in results:
                        if result and result.get("status") == "success":
                            self._enrich_graph(
                                payload, fetcher_name, result, source_canonical_id=source_id
                            )
                            if depth < max_depth:
                                next_frontier.extend(
                                    self._discover_pivots(result, pivot_seed, source_id)
                                )

                frontier = next_frontier

                # Re-score the cumulative graph at this depth and measure velocity
                assessment = self._risk_engine.evaluate(payload)
                assessment.depth = depth
                assessment.velocity_delta = (
                    0.0 if previous_score is None else float(assessment.score - previous_score)
                )
                previous_score = assessment.score
                latest = assessment

                depth_history.append(
                    {
                        "depth": depth,
                        "score": assessment.score,
                        "level": assessment.level.value,
                        "velocity_delta": assessment.velocity_delta,
                        "badge": format_velocity_badge(assessment),
                    }
                )

        assert latest is not None  # loop always runs at least depth 1
        payload.risk_score = latest.score
        payload.metadata.update(
            {
                "risk_level": latest.level.value,
                "triggered_rules": latest.triggered_rules,
                "confidence_delta": latest.confidence_delta,
                "velocity_delta": latest.velocity_delta,
                "attacker_surface_velocity": format_velocity_badge(latest),
                "depth_scores": depth_history,
            }
        )

        return payload

    async def _execute_fetcher_safely(
        self, fetcher: BaseFetcher, seed: SeedInput, client: httpx.AsyncClient
    ) -> tuple[str, Dict[str, Any]]:
        """Wraps fetcher execution in hard timeouts and exception barriers.

        The shared token bucket is acquired *before* the module starts, so no
        more requests than the configured rate/burst are ever in flight or
        launched back-to-back — even when ``asyncio.gather`` fans out a large
        recursive seed tree at once.
        """
        await self._bucket.acquire()
        try:
            result = await asyncio.wait_for(
                fetcher.fetch(seed, client),
                timeout=fetcher.timeout,
            )
            return fetcher.name, result
        except asyncio.TimeoutError:
            logger.warning(f"Module '{fetcher.name}' timed out after {fetcher.timeout}s")
            return fetcher.name, {"status": "timeout", "reason": "Hard timeout exceeded"}
        except Exception as e:  # noqa: BLE001
            logger.error(
                f"Module '{fetcher.name}' threw uncaught exception: {str(e)}",
                exc_info=True,
            )
            return fetcher.name, {"status": "failed", "reason": str(e)}

    def _discover_pivots(
        self, result: Dict[str, Any], pivot_seed: SeedInput, source_id: str
    ) -> List[Tuple[SeedInput, str]]:
        """Extract next-depth pivot seeds from a successful module result.

        Current pivot sources:
          - Breach entries -> the breached organization's domain (DNS sweep).
          - Gravatar associated_urls -> external domains the target controls.
        Each pivot carries the canonical id of the node that surfaced it so
        the graph can link the new entity to its discovery source.
        """
        pivots: List[Tuple[SeedInput, str]] = []

        # Breach -> domain pivots
        for breach in result.get("breaches", []) or []:
            domain = (breach.get("domain") or "").strip().lower()
            if not domain:
                continue
            name = (breach.get("name") or "").strip().lower()
            breach_canonical = f"breach:{name}" if name else source_id
            pivots.append((SeedInput(value=domain, seed_type=SeedType.DOMAIN), breach_canonical))

        # Gravatar profile -> external URL domains
        if "has_profile" in result:
            urls = result.get("associated_urls", []) or []
            if result.get("username"):
                gravatar_canonical = f"username:{result['username']}"
            else:
                gravatar_canonical = f"gravatar:{pivot_seed.value}"
            for url in urls:
                try:
                    host = (urlparse(url).hostname or "").strip().lower()
                except ValueError:
                    continue
                if host:
                    pivots.append((SeedInput(value=host, seed_type=SeedType.DOMAIN), gravatar_canonical))

        return pivots

    def _enrich_graph(
        self,
        payload: InvestigationPayload,
        fetcher_name: str,
        data: Dict[str, Any],
        source_canonical_id: Optional[str] = None,
    ) -> None:
        """Parses module output dictionaries into unified Graph Nodes and Edges.

        ``source_canonical_id`` is the node that surfaced this result — the
        root seed for depth-1 sweeps, or the pivoting entity (breach node,
        Gravatar profile) for deeper sweeps. Defaults to the root.
        """
        root_canonical_id = f"{payload.seed.seed_type.value}:{payload.seed.value}"
        link_source = source_canonical_id or root_canonical_id
        existing_ids = {n.canonical_id for n in payload.nodes}

        # Processing DNS / Infrastructure outputs
        if "domain" in data:
            domain_canonical = f"domain:{data['domain']}"

            # Skip duplicates — covers re-sweeps and the root-IS-domain case
            # (the root node already occupies its canonical id in the graph).
            if domain_canonical not in existing_ids:
                domain_node = GraphNode(
                    canonical_id=domain_canonical,
                    category=NodeCategory.INFRASTRUCTURE,
                    label=data["domain"],
                    metadata={
                        "has_spf": data.get("has_spf", False),
                        "has_dmarc": data.get("has_dmarc", False),
                        "has_bimi": data.get("has_bimi", False),
                        "mx_records": data.get("mx_records", []),
                    },
                )
                payload.nodes.append(domain_node)
                payload.edges.append(
                    GraphEdge(
                        source_canonical_id=link_source,
                        target_canonical_id=domain_canonical,
                        relationship="ASSOCIATED_DOMAIN",
                        confidence=1.0,
                    )
                )

        # Processing Gravatar outputs
        if "has_profile" in data and data["has_profile"]:
            gravatar_canonical = (
                f"username:{data['username']}" if data.get("username") else f"gravatar:{payload.seed.value}"
            )
            if gravatar_canonical not in existing_ids:
                gravatar_node = GraphNode(
                    canonical_id=gravatar_canonical,
                    category=NodeCategory.SOCIAL,
                    label=data.get("display_name") or data.get("username") or "Gravatar Profile",
                    metadata={
                        "avatar_url": data.get("avatar_url"),
                        "location": data.get("location"),
                        "associated_urls": data.get("associated_urls", []),
                    },
                )
                payload.nodes.append(gravatar_node)
                payload.edges.append(
                    GraphEdge(
                        source_canonical_id=link_source,
                        target_canonical_id=gravatar_canonical,
                        relationship="HAS_GRAVATAR_PROFILE",
                        confidence=1.0,
                    )
                )

        # Processing Breach outputs
        if "breaches" in data and data["breaches"]:
            for breach in data["breaches"]:
                breach_canonical = f"breach:{breach['name'].lower()}"
                if breach_canonical in existing_ids:
                    continue
                # Data Class Risk Severity Index (computed upstream, or empty).
                risk_index = breach.get("risk_index", {}) or {}
                breach_node = GraphNode(
                    canonical_id=breach_canonical,
                    category=NodeCategory.BREACH,
                    label=f"Breach: {breach['name']}",
                    metadata={
                        "domain": breach.get("domain"),
                        "breach_date": breach.get("breach_date"),
                        "exposed_data": breach.get("data_classes", []),
                        # Risk severity for frontend color-coding
                        "risk_score": risk_index.get("score", 0),
                        "risk_severity": risk_index.get("color_severity", "none"),
                        "risk_detail": risk_index.get("detail", []),
                        "max_severity": risk_index.get("max_severity", "none"),
                    },
                )
                payload.nodes.append(breach_node)
                payload.edges.append(
                    GraphEdge(
                        source_canonical_id=link_source,
                        target_canonical_id=breach_canonical,
                        relationship="EXPOSED_IN",
                        confidence=1.0,
                    )
                )

    def _map_seed_to_category(self, seed_type: SeedType) -> NodeCategory:
        mapping = {
            SeedType.EMAIL: NodeCategory.IDENTITY,
            SeedType.USERNAME: NodeCategory.SOCIAL,
            SeedType.PHONE: NodeCategory.TELEPHONY,
            SeedType.DOMAIN: NodeCategory.INFRASTRUCTURE,
            SeedType.IP: NodeCategory.INFRASTRUCTURE,
            SeedType.URL: NodeCategory.URL,
        }
        return mapping.get(seed_type, NodeCategory.IDENTITY)
