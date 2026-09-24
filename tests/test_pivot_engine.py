"""Tests for the Phase-4 pivot engine graph mutation & investigation orchestration.

Uses dependency-injected fake resolvers so no DNS/RDAP/SMTP network traffic
is ever touched.
"""

import asyncio

import pytest

from core.pivot_engine import (
    build_rdap_node,
    build_ip_geo_node,
    classify_risk,
    investigate_target,
    pivot_node,
    risk_style,
)


def run(coro):
    return asyncio.run(coro)


FAKE_DNS = {
    "status": "success",
    "domain": "example.com",
    "a_records": ["93.184.216.34"],
    "aaaa_records": [],
    "mx_records": ["mail.example.com"],
    "mx_details": [{"host": "mail.example.com", "priority": 10}],
    "has_spf": True,
    "has_dmarc": True,
    "dmarc_policy": {"policy": "reject"},
    "risk_flags": [],
}

FAKE_RDAP = {
    "status": "success",
    "found": True,
    "entity": "example.com",
    "registrar": "Example Registrar Inc",
    "creation_date": "1995-08-14T04:00:00Z",
    "expiration_date": "2026-08-13T04:00:00Z",
    "nameservers": ["a.iana-servers.net"],
}

FAKE_GEO = {
    "status": "success",
    "city": "London",
    "country_code": "GB",
    "latitude": 51.5,
    "longitude": -0.1,
    "asn": 15169,
}


def test_build_rdap_node_clean_label_and_data_bundle():
    node = build_rdap_node("example.com", FAKE_RDAP)
    assert node.label == "example.com"
    assert node.canonical_id == "domain:example.com"
    assert node.metadata["data"]["registrar"] == "Example Registrar Inc"


def test_build_ip_geo_node_merges_geo_into_metadata():
    node = build_ip_geo_node("93.184.216.34", FAKE_GEO)
    assert node.label == "93.184.216.34"
    assert node.metadata["city"] == "London"
    assert node.metadata["data"]["asn"] == 15169


def test_classify_risk_boundaries():
    assert classify_risk(pwned_count=50) == "CRITICAL"
    assert classify_risk(pwned_count=49) == "HIGH"
    assert classify_risk(dmarc_policy="reject") == "CLEAN"
    assert classify_risk(missing_spf=True) == "MEDIUM"
    assert classify_risk(has_mx=False) == "MEDIUM"


async def fake_resolve_domain_security(domain, timeout=4.0):
    return FAKE_DNS


async def fake_fetch_rdap_telemetry(entity, client=None, timeout=8.0):
    return FAKE_RDAP


def test_investigate_target_orchestrates_and_styles(monkeypatch):
    import core.pivot_engine as pe

    monkeypatch.setattr(pe, "resolve_domain_security", fake_resolve_domain_security)
    monkeypatch.setattr(pe, "fetch_rdap_telemetry", fake_fetch_rdap_telemetry)

    result = run(pe.investigate_target("example.com", "domain"))
    nodes = result["nodes"]
    edges = result["edges"]

    assert result["risk_level"] in ("CLEAN", "LOW")
    labels = {n.label for n in nodes}
    assert "example.com" in labels
    assert "mail.example.com" in labels
    rels = {e.relationship for e in edges}
    assert "HAS_MAIL_EXCHANGER" in rels
    # Root carries a `style` bundle matching the Phase-4 visual contract.
    root = next(n for n in nodes if n.metadata.get("is_root_seed"))
    assert "style" in root.metadata and "border" in root.metadata["style"]
    # Every node carries full telemetry under metadata.data (not canvas text).
    assert all("data" in n.metadata for n in nodes)


def test_investigate_target_styles_high_risk_on_missing_dmarc(monkeypatch):
    import core.pivot_engine as pe

    bad_dns = {**FAKE_DNS, "has_dmarc": False, "dmarc_policy": None, "risk_flags": ["MISSING_DMARC"]}
    monkeypatch.setattr(pe, "resolve_domain_security", lambda domain, timeout=4.0: _fake(bad_dns))
    monkeypatch.setattr(pe, "fetch_rdap_telemetry", fake_fetch_rdap_telemetry)

    result = run(pe.investigate_target("example.com", "domain"))
    assert result["risk_level"] == "MEDIUM"
    root = next(n for n in result["nodes"] if n.metadata.get("is_root_seed"))
    assert root.metadata["style"]["border"] == "#FFB800"


async def _fake(payload):
    return payload


def test_pivot_domain_expands_to_ip_nodes(monkeypatch):
    import core.pivot_engine as pe

    monkeypatch.setattr(pe, "resolve_domain_security", fake_resolve_domain_security)
    result = run(pe.pivot_node("domain:example.com", "domain"))
    ip_nodes = [n for n in result["nodes"] if n.canonical_id.startswith("ip:")]
    assert any(ip.canonical_id == "ip:93.184.216.34" for ip in ip_nodes)
    assert any(e.relationship == "USES_INFRASTRUCTURE" for e in result["edges"])


def test_pivot_email_adds_domain_belongs_to():
    import core.pivot_engine as pe

    result = run(pe.pivot_node("email:user@example.com", "email"))
    assert any(n.canonical_id == "domain:example.com" for n in result["nodes"])
    assert any(e.relationship == "BELONGS_TO" for e in result["edges"])


def test_pivot_ip_adds_geo_telemetry():
    import core.pivot_engine as pe

    result = run(pe.pivot_node("ip:93.184.216.34", "ip"))
    assert any(n.canonical_id == "ip:93.184.216.34" for n in result["nodes"])
    assert any(n.metadata.get("ip") == "93.184.216.34" for n in result["nodes"])


def test_pivot_unknown_type_returns_graceful_error():
    import core.pivot_engine as pe

    result = run(pe.pivot_node("who:?@", "unknown"))
    assert result["nodes"] == []
    assert "error" in result["telemetry"]


def test_risk_style_contract_red_pulse_critical():
    style = risk_style("CRITICAL")
    assert style["border"] == "#FF3366"
    assert style["pulse"] is True
    med = risk_style("MEDIUM")
    assert med["border"] == "#FFB800"
    clean = risk_style("CLEAN")
    assert clean["border"] == "#00E5FF"