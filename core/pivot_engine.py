"""ThreatScope Graph Integration & Pivot Controller.

Wires the Phase-2/3 native resolvers into the graph synthesizer and exposes
a headless pivot API the sidecar can invoke:

* :func:`investigate_target` — runs DNS, RDAP, GeoIP and local k-anonymity
  checks **in parallel** (``asyncio.gather``) and assembles a structured
  ``{nodes, edges}`` graph payload with clean, minimal labels and a full
  telemetry bundle stashed in ``node.data`` for the detail drawer.

* :func:`pivot_node` — expands an existing node without clearing the
  canvas:
    - DOMAIN node  -> resolves MX / A records to IPs, inserting new
      ``ip:`` nodes joined by ``USES_INFRASTRUCTURE`` edges.
    - EMAIL node   -> extracts the domain and adds a ``BELONGS_TO`` edge.
    - IP node      -> attaches geo telemetry already stored on the node.

* Risk-tier styling — ``classify_risk`` maps security findings to the
  frontend border/pulse contract:
    - CRITICAL / HIGH  -> red border (``#FF3366``), pulse if breached.
    - MEDIUM           -> amber (``#FFB800``) for unenforced DMARC / missing SPF.
    - LOW / CLEAN      -> cyan (``#00E5FF``) for authenticated infrastructure.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List

from core.schemas import GraphEdge, GraphNode, InvestigationPayload, NodeCategory
from core.resolvers import (
    fetch_rdap_telemetry,
    inspect_smtp_gateway,
    resolve_domain_security,
)
from core.local_engine import LocalKAnonymityStore

__all__ = [
    "classify_risk",
    "risk_style",
    "investigate_target",
    "pivot_node",
    "build_rdap_node",
    "build_ip_geo_node",
]

# Frontend visual contract (mirrored by GraphCanvas CATEGORY_COLORS).
RISK_STYLE_MAP = {
    "CRITICAL": {"border": "#FF3366", "glow": True, "pulse": True},
    "HIGH":     {"border": "#FF3366", "glow": True, "pulse": False},
    "MEDIUM":   {"border": "#FFB800", "glow": False, "pulse": False},
    "LOW":      {"border": "#00E5FF", "glow": True, "pulse": False},
    "CLEAN":    {"border": "#00E5FF", "glow": False, "pulse": False},
}


def risk_style(level: str) -> Dict[str, Any]:
    """Return the visual style dict for a risk tier."""
    return RISK_STYLE_MAP.get(level, RISK_STYLE_MAP["CLEAN"])


def classify_risk(
    *,
    pwned_count: int = 0,
    missing_spf: bool = False,
    missing_dmarc: bool = False,
    dmarc_policy: str = "none",
    has_mx: bool = True,
) -> str:
    """Map security findings to a risk tier string.

    Priority: active breach exposure > hard fail posture > amber posture >
    clean.  Mirrors the frontend's ``deriveRiskLevel`` heuristics.
    """
    if pwned_count >= 50:
        return "CRITICAL"
    if pwned_count >= 10:
        return "HIGH"
    if pwned_count >= 1:
        return "MEDIUM"
    if missing_spf or missing_dmarc:
        return "MEDIUM"
    if not has_mx:
        return "MEDIUM"
    if dmarc_policy in ("none",):
        return "LOW"
    if dmarc_policy in ("quarantine", "reject"):
        return "CLEAN"
    return "LOW"
# --------------------------------------------------------------------------- #
# Graph node factories (clean labels + full `data` telemetry bundles)
# --------------------------------------------------------------------------- #
def build_rdap_node(entity: str, rdap: Dict[str, Any]) -> GraphNode:
    """Build a domain registration node from RDAP telemetry."""
    if not rdap.get("found"):
        return GraphNode(
            canonical_id=f"domain:{entity}",
            category=NodeCategory.INFRASTRUCTURE,
            label=entity,
            metadata={"risk_level": "LOW", "data": rdap},
        )
    risk = "MEDIUM" if (rdap.get("expiration_date") is None) else "LOW"
    return GraphNode(
        canonical_id=f"domain:{entity}",
        category=NodeCategory.INFRASTRUCTURE,
        label=entity,
        metadata={
            "risk_level": risk,
            "registrar": rdap.get("registrar"),
            "creation_date": rdap.get("creation_date"),
            "expiration_date": rdap.get("expiration_date"),
            "nameservers": rdap.get("nameservers"),
            # Full telemetry bundle for the contextual drawer.
            "data": rdap,
        },
    )


def build_ip_geo_node(ip: str, geo: Dict[str, Any]) -> GraphNode:
    """Build an IP infrastructure node with offline GeoIP telemetry."""
    return GraphNode(
        canonical_id=f"ip:{ip}",
        category=NodeCategory.INFRASTRUCTURE,
        label=ip,
        metadata={
            **geo,
            "risk_level": "LOW",
            "data": geo,
        },
    )


# --------------------------------------------------------------------------- #
# 1. Unified investigation orchestrator
# --------------------------------------------------------------------------- #
async def investigate_target(
    target: str,
    target_type: str = "domain",
    *,
    smtp_probe: bool = False,
    geo_store: Any = None,
) -> Dict[str, Any]:
    """Run DNS, RDAP, GeoIP and local k-anonymity checks in parallel.

    Returns ``{nodes, edges, telemetry}`` where each node carries a minimal
    ``label`` and a full ``data`` telemetry bundle (not canvas text).
    """
    email_domain = target.split("@")[-1] if "@" in target else target
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    telemetry: Dict[str, Any] = {}

    # -- Phase 2: DNS + RDAP in parallel ------------------------------------
    dns_task = asyncio.create_task(resolve_domain_security(email_domain))
    rdap_task = asyncio.create_task(fetch_rdap_telemetry(email_domain))
    dns_payload, rdap_payload = await asyncio.gather(dns_task, rdap_task)
    telemetry["dns"] = dns_payload
    telemetry["rdap"] = rdap_payload

    root = GraphNode(
        canonical_id=f"{target_type}:{target}",
        category=(
            NodeCategory.INFRASTRUCTURE
            if target_type in ("domain", "ip")
            else NodeCategory.IDENTITY
        ),
        label=target,
        metadata={"is_root_seed": True, "data": telemetry},
    )
    nodes.append(root)
    root_id = root.canonical_id

    # RDAP registration node (if found).
    if rdap_payload.get("found"):
        rdap_node = build_rdap_node(email_domain, rdap_payload)
        if rdap_node.canonical_id != root_id:
            nodes.append(rdap_node)
            edges.append(
                GraphEdge(
                    source_canonical_id=root_id,
                    target_canonical_id=rdap_node.canonical_id,
                    relationship="REGISTERED_AT",
                    confidence=0.9,
                )
            )
# Resolve MX hosts -> MX nodes (HAS_MAIL_EXCHANGER).
    for mx in dns_payload.get("mx_records") or []:
        edges.append(
            GraphEdge(
                source_canonical_id=root_id,
                target_canonical_id=f"mx:{mx}",
                relationship="HAS_MAIL_EXCHANGER",
                confidence=0.95,
            )
        )
        nodes.append(
            GraphNode(
                canonical_id=f"mx:{mx}",
                category=NodeCategory.INFRASTRUCTURE,
                label=mx,
                metadata={"risk_level": "LOW", "data": dns_payload},
            )
        )

    # -- Phase 3: SMTP banner probe (optional) ------------------------------
    if smtp_probe and dns_payload.get("mx_records"):
        smtp_target = dns_payload["mx_records"][0]
        smtp_payload = await inspect_smtp_gateway(smtp_target, timeout=6.0)
        telemetry["smtp"] = smtp_payload

    # -- Phase 3: local k-anonymity check -----------------------------------
    if geo_store is not None:
        try:
            from core.kanonymity import split_hash, EntityType

            split = split_hash(email_domain, entity_type=EntityType.DOMAIN)
            count = geo_store.lookup(split.prefix, split.suffix)
            pwned = int(count or 0)
            if pwned:
                telemetry["breach"] = {
                    "status": "verified",
                    "compromised": True,
                    "pwned_count": pwned,
                    "threat_level": "CRITICAL" if pwned >= 50 else "HIGH" if pwned >= 10 else "MEDIUM",
                    "k_anonymity_bucket_size": 0,
                }
        except Exception as exc:  # local DB must never crash a scan
            telemetry["breach"] = {"status": "failed", "reason": str(exc)}

    # -- Risk-tier styling ---------------------------------------------------
    dns_posture = dns_payload
    pwned = (telemetry.get("breach") or {}).get("pwned_count", 0)
    level = classify_risk(
        pwned_count=pwned,
        missing_spf=not dns_posture.get("has_spf", False),
        missing_dmarc=not dns_posture.get("has_dmarc", False),
        dmarc_policy=(dns_posture.get("dmarc_policy") or {}).get("policy", "none"),
        has_mx=bool(dns_posture.get("mx_records")),
    )
    root.metadata.update({"risk_level": level, "style": risk_style(level)})

    return {"nodes": nodes, "edges": edges, "telemetry": telemetry, "risk_level": level}
# --------------------------------------------------------------------------- #
# 2. Node pivot action handler
# --------------------------------------------------------------------------- #
async def pivot_node(
    node_id: str,
    pivot_type: str,
    *,
    dns_payload: Dict[str, Any] | None = None,
    geo_store: Any = None,
) -> Dict[str, Any]:
    """Expand a graph node without clearing the canvas.

    - ``domain`` / ``mx`` -> resolve A records to IP nodes (USES_INFRASTRUCTURE).
    - ``email`` -> attach the domain entity via BELONGS_TO.
    - ``ip`     -> attach offline geo telemetry.
    """
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    telemetry: Dict[str, Any] = {"pivot_type": pivot_type}

    if pivot_type in ("domain", "mx"):
        domain = node_id.split(":", 1)[-1]
        dns = dns_payload or await resolve_domain_security(domain)
        telemetry["dns"] = dns
        # Domain A / AAAA records become IP infrastructure nodes.
        ip_sources = list(dns.get("a_records") or []) + list(dns.get("aaaa_records") or [])
        for ip in ip_sources:
            geo = None
            if geo_store is not None:
                try:
                    from core.local_engine import resolve_ip_location

                    geo = await asyncio.to_thread(resolve_ip_location, ip)
                except Exception as exc:
                    geo = {"status": "failed", "reason": str(exc)}
            ip_node = build_ip_geo_node(ip, geo or {"ip": ip})
            nodes.append(ip_node)
            edges.append(
                GraphEdge(
                    source_canonical_id=node_id,
                    target_canonical_id=ip_node.canonical_id,
                    relationship="USES_INFRASTRUCTURE",
                    confidence=0.9,
                )
            )
    elif pivot_type == "email":
        domain = node_id.split(":", 1)[-1].split("@")[-1]
        nodes.append(
            GraphNode(
                canonical_id=f"domain:{domain}",
                category=NodeCategory.INFRASTRUCTURE,
                label=domain,
                metadata={"risk_level": "LOW", "data": telemetry},
            )
        )
        edges.append(
            GraphEdge(
                source_canonical_id=node_id,
                target_canonical_id=f"domain:{domain}",
                relationship="BELONGS_TO",
                confidence=1.0,
            )
        )
    elif pivot_type == "ip":
        ip = node_id.split(":", 1)[-1]
        geo = None
        if geo_store is not None:
            try:
                from core.local_engine import resolve_ip_location

                geo = await asyncio.to_thread(resolve_ip_location, ip)
            except Exception as exc:
                geo = {"status": "failed", "reason": str(exc)}
        telemetry["geo"] = geo
        nodes.append(build_ip_geo_node(ip, geo or {"ip": ip}))
    else:
        return {
            "nodes": [],
            "edges": [],
            "telemetry": {"error": f"Unsupported pivot type: {pivot_type}"},
        }

    return {"nodes": nodes, "edges": edges, "telemetry": telemetry}