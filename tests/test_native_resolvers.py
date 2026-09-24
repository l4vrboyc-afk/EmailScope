"""Tests for the Phase-2/3 native resolver + local k-Anonymity modules.

Covers the offline pure logic (SPF/DMARC/EHLO parsing, RDAP normalization,
SQLite store roundtrip + HIBP range format, prefix performance) plus the
pure-risk classifier from the pivot engine — without touching the network.
"""

import time

import pytest

from core.resolvers import (
    parse_spf_record,
    parse_dmarc_record,
    parse_ehlo_extensions,
    parse_rdap_payload,
)
from core.local_engine import LocalKAnonymityStore, _normalize_line
from core.pivot_engine import classify_risk, risk_style
from core.kanonymity import split_hash


# --------------------------------------------------------------------------- #
# SPF parsing
# --------------------------------------------------------------------------- #
def test_spf_hardfail_enforced():
    spf = parse_spf_record("v=spf1 include:_spf.google.com -all")
    assert spf["all_qualifier"] == "-"
    assert spf["all_enforcement"] == "enforced"
    assert spf["enforced"] is True
    assert spf["mechanisms"] == ["include:_spf.google.com", "-all"]


def test_spf_softfail_not_enforced():
    spf = parse_spf_record("v=spf1 include:_spf.example.com ~all")
    assert spf["all_enforcement"] == "softfail"
    assert spf["enforced"] is False


def test_spf_allow_any_is_flag():
    spf = parse_spf_record("v=spf1 +all")
    assert spf["all_enforcement"] == "allow_any"
    assert spf["enforced"] is False


def test_spf_redirect():
    spf = parse_spf_record("v=spf1 redirect=example.net")
    assert spf["redirect"] == "example.net"
    assert spf["all_enforcement"] == "redirected"
    assert spf["enforced"] is True


# --------------------------------------------------------------------------- #
# DMARC parsing
# --------------------------------------------------------------------------- #
def test_dmarc_reject_enforced():
    dmarc = parse_dmarc_record("v=DMARC1; p=reject; rua=mailto:dmarc@example.com")
    assert dmarc["policy"] == "reject"
    assert dmarc["enforced"] is True
    assert dmarc["monitor_only"] is False
    assert dmarc["rua"] == "mailto:dmarc@example.com"


def test_dmarc_none_is_monitor_only():
    dmarc = parse_dmarc_record("v=DMARC1; p=none")
    assert dmarc["policy"] == "none"
    assert dmarc["enforced"] is False
    assert dmarc["monitor_only"] is True


def test_dmarc_partial_pct():
    dmarc = parse_dmarc_record("v=DMARC1; p=reject; pct=50")
    assert dmarc["partial"] is True
    assert dmarc["pct"] == 50


# --------------------------------------------------------------------------- #
# SMTP EHLO extension parsing
# --------------------------------------------------------------------------- #
def test_ehlo_extensions_parsed():
    raw = "250-mail.example.com\n250-STARTTLS\n250-SIZE 10485760\n250 VRFY\n250-PIPELINING"
    ext = parse_ehlo_extensions(raw)
    assert "STARTTLS" in ext
    assert "SIZE" in ext
    assert "VRFY" in ext
    assert "PIPELINING" in ext
    # Status prefix lines without a capability token are dropped.
    assert "250" not in ext
# --------------------------------------------------------------------------- #
# RDAP normalization
# --------------------------------------------------------------------------- #
def test_rdap_parse_events_and_nameservers():
    payload = parse_rdap_payload(
        "example.com",
        {
            "events": [
                {"eventAction": "registration", "eventDate": "1995-08-14T04:00:00Z"},
                {"eventAction": "expiration", "eventDate": "2026-08-13T04:00:00Z"},
            ],
            "nameservers": [{"ldhName": "a.iana-servers.net."}],
            "status": ["client delete prohibited"],
            "entities": [
                {
                    "roles": ["registrar"],
                    "vcardArray": ["vcard", [["fn", {}, "text", "Example Registrar Inc"]]],
                }
            ],
        },
    )
    assert payload["creation_date"] == "1995-08-14T04:00:00Z"
    assert payload["expiration_date"] == "2026-08-13T04:00:00Z"
    assert payload["nameservers"] == ["a.iana-servers.net"]
    assert payload["registrar"] == "Example Registrar Inc"


# --------------------------------------------------------------------------- #
# Local k-anonymity store
# --------------------------------------------------------------------------- #
def test_normalize_line_splits_full_sha1():
    sha1 = split_hash("hunter2", algorithm="sha1").digest_hex
    row = _normalize_line(f"{sha1}:7")
    assert row is not None
    prefix, suffix, count = row
    assert len(prefix) == 5 and len(suffix) == 35
    assert count == 7
    assert prefix + suffix == sha1


def test_local_store_roundtrip_and_hibp_format(tmp_path):
    store = LocalKAnonymityStore(str(tmp_path / "test_hashes.db"))
    sha1_lines = [f"{split_hash(f'pwd{i}').digest_hex}:{1 + i}" for i in range(5)]
    inserted = store.ingest_lines(iter(sha1_lines), batch_size=2)
    assert inserted == 5
    assert store.total_records() == 5

    target = split_hash("pwd2")
    body = store.query_hash_prefix(target.prefix)
    assert f"{target.suffix}:3" in body  # HIBP-standard SUFFIX:COUNT line
    assert store.lookup(target.prefix, target.suffix) == 3
    assert store.lookup(target.prefix, "Z" * 35) is None
    store.close()


def test_local_store_range_query_under_10ms(tmp_path):
    store = LocalKAnonymityStore(str(tmp_path / "perf.db"))
    lines = [f"{split_hash(f'user{i}@example.com').digest_hex}:{i % 7}" for i in range(2000)]
    store.ingest_lines(iter(lines))
    target = split_hash("user100@example.com")
    started = time.perf_counter()
    body = store.query_hash_prefix(target.prefix)
    elapsed_ms = (time.perf_counter() - started) * 1000
    assert body  # bucket exists
    assert elapsed_ms < 10.0
    store.close()


# --------------------------------------------------------------------------- #
# Pivot-engine risk classifier + visual contract
# --------------------------------------------------------------------------- #
def test_classify_risk_priority_order():
    assert classify_risk(pwned_count=60) == "CRITICAL"
    assert classify_risk(pwned_count=12) == "HIGH"
    assert classify_risk(pwned_count=3) == "MEDIUM"
    assert classify_risk(missing_spf=True) == "MEDIUM"
    assert classify_risk(missing_dmarc=True) == "MEDIUM"
    assert classify_risk(dmarc_policy="reject") == "CLEAN"
    assert classify_risk(dmarc_policy="quarantine") == "CLEAN"
    assert classify_risk(dmarc_policy="none") == "LOW"
    assert classify_risk(has_mx=False) == "MEDIUM"


def test_risk_style_visual_contract():
    critical = risk_style("CRITICAL")
    assert critical["border"] == "#FF3366" and critical["pulse"] is True
    clean = risk_style("CLEAN")
    assert clean["border"] == "#00E5FF"
    medium = risk_style("MEDIUM")
    assert medium["border"] == "#FFB800"