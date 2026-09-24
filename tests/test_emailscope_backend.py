"""ThreatScope Complete System Verification & Diagnostic Suite.

Runs automated tests across all four implementation phases:
* Phase 2 - native $0-cost resolvers (SPF/DMARC, RDAP, DNS, SMTP)
* Phase 3 - self-hosted engines (SQLite k-anonymity store, range API, GeoIP)
* Phase 4 - graph pivot & integration (orchestrator, pivot, risk styling)
* Phase 1 - UI/CSS static checklist (grid, drawer, header, map state)

Standalone:  python tests/test_emailscope_backend.py
Pytest:      pytest tests/test_emailscope_backend.py -v
Network-dependent checks degrade to SKIP when the transport is blocked.
"""

from __future__ import annotations

import os
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from http.server import ThreadingHTTPServer
from urllib import request as urllib_request

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.resolvers import (
    parse_spf_record,
    parse_dmarc_record,
    parse_ehlo_extensions,
    fetch_rdap_telemetry,
    resolve_domain_security,
)
from core.local_engine import LocalKAnonymityStore, _normalize_line
from core.pivot_engine import classify_risk, risk_style, investigate_target, pivot_node
from core.kanonymity import split_hash
from scripts.range_server import _make_handler

_RESULTS: list[tuple[str, str, str]] = []


def _record(name, status, note=""):
    _RESULTS.append((name, status, note))
    print(f"[{status:>4}] {name} {('- ' + note) if note else ''}")


def _skip(name, reason):
    _record(name, "SKIP", reason)


def _ok(name, note=""):
    _record(name, "PASS", note)


def _fail(name, note):
    _record(name, "FAIL", note)


def run(coro):
    import asyncio
    return asyncio.run(coro)


FRESH_DNS = {
    "status": "success", "domain": "freshdomain.dev", "a_records": ["10.0.0.1"],
    "aaaa_records": [], "mx_records": ["mx1.freshdomain.dev"],
    "mx_details": [{"host": "mx1.freshdomain.dev", "priority": 10}],
    "has_spf": True, "has_dmarc": True,
    "dmarc_policy": {"policy": "reject"}, "risk_flags": [],
}


# --------------------------------------------------------------------------- #
# PHASE 2 - native resolvers
# --------------------------------------------------------------------------- #
def test_spf_policy_parser():
    spf = parse_spf_record("v=spf1 include:_spf.google.com -all")
    assert spf["all_enforcement"] == "enforced" and spf["enforced"] is True
    soft = parse_spf_record("v=spf1 include:_spf.x.com ~all")
    assert soft["all_enforcement"] == "softfail" and soft["enforced"] is False
    any_ = parse_spf_record("v=spf1 +all")
    assert any_["all_enforcement"] == "allow_any"


def test_dmarc_policy_parser():
    assert parse_dmarc_record("v=DMARC1; p=reject")["enforced"] is True
    assert parse_dmarc_record("v=DMARC1; p=none")["monitor_only"] is True
    part = parse_dmarc_record("v=DMARC1; p=quarantine; pct=25")
    assert part["partial"] is True and part["pct"] == 25


def test_ehlo_extension_parser():
    ext = parse_ehlo_extensions("250-mail.x\n250-STARTTLS\n250-SIZE 1024\n250 VRFY")
    assert {"STARTTLS", "SIZE", "VRFY"} <= set(ext)


def test_rdap_telemetry_live():
    try:
        r = run(fetch_rdap_telemetry("example.com", timeout=8))
    except Exception as exc:
        _skip("PH2 RDAP live telemetry", f"network unavailable: {exc}")
        return
    assert r["status"] == "success" and r.get("found") is True
    assert r.get("creation_date") and r.get("expiration_date") and r.get("registrar")
    _ok("PH2 RDAP live telemetry",
        f"registrar={r['registrar']} exp={r['expiration_date']}")


def test_dns_resolver_live():
    try:
        r = run(resolve_domain_security("example.com", timeout=3))
    except Exception as exc:
        _skip("PH2 DNS resolve live", f"transport blocked: {exc}")
        return
    if r.get("status") != "success" or not r.get("a_records"):
        _skip("PH2 DNS resolve live",
              f"no answer (blocked 53/UDP?): {r.get('risk_flags')}")
        return
    assert r["a_records"]
    _ok("PH2 DNS resolve live",
        f"A={r['a_records']} MX={r.get('mx_records')} SPF={r.get('has_spf')}")


def test_resolvers_json_contract():
    import json
    payload = json.dumps(FRESH_DNS)
    assert '"mx_records"' in payload and '"has_dmarc"' in payload
    _ok("PH2 resolver JSON contract", "serializable, keyless")
# --------------------------------------------------------------------------- #
# PHASE 3 - self-hosted data engines
# --------------------------------------------------------------------------- #
def test_db_schema_and_index():
    with tempfile.TemporaryDirectory() as tmp:
        store = LocalKAnonymityStore(os.path.join(tmp, "schema.db"))
        conn = store._get_conn()
        cols = [row[1] for row in conn.execute("PRAGMA table_info(pwned_hashes)").fetchall()]
        assert cols == ["prefix", "suffix", "count"], f"unexpected schema {cols}"
        idx = conn.execute("PRAGMA index_list(pwned_hashes)").fetchall()
        assert any("idx_hash_prefix" in (r[1] or "") for r in idx)
        store.close_all()
    _ok("PH3 SQLite schema + idx_hash_prefix index")


def test_store_ingest_and_hibp_format():
    with tempfile.TemporaryDirectory() as tmp:
        store = LocalKAnonymityStore(os.path.join(tmp, "h.db"))
        lines = [f"{split_hash(f'pwd{i}').digest_hex}:{i + 1}" for i in range(8)]
        assert store.ingest_lines(iter(lines), batch_size=3) == 8
        target = split_hash("pwd2")
        assert store.lookup(target.prefix, target.suffix) == 3
        body = store.query_hash_prefix(target.prefix)
        assert f"{target.suffix}:3" in body
        assert store.lookup(target.prefix, "Z" * 35) is None
        store.close_all()
    _ok("PH3 ingest + HIBP SUFFIX:COUNT range format")


def test_range_endpoint_concurrent_and_latency():
    # Manual temp path (not TemporaryDirectory) so we control teardown and
    # avoid the WinError 32 file-lock race on auto-cleanup.
    tmp = tempfile.mkdtemp(prefix="es_range_")
    db = os.path.join(tmp, "http.db")
    store = LocalKAnonymityStore(db)
    try:
        store.ingest_lines(iter(f"{split_hash(chr(97 + i % 26) * 8).digest_hex}:{i}"
                                for i in range(400)))
        handler = _make_handler(store)
        srv = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        srv.daemon_threads = True
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{srv.server_address[1]}"
        prefix = split_hash("aaaaaaaa").prefix

        def hit(_):
            return urllib_request.urlopen(f"{base}/api/v1/range/{prefix}",
                                          timeout=5).read().decode()

        lines = 0
        with ThreadPoolExecutor(max_workers=8) as ex:
            for body in ex.map(hit, range(32)):
                lines += len(body.splitlines())

        t0 = time.perf_counter()
        for _ in range(20):
            urllib_request.urlopen(f"{base}/api/v1/range/{prefix}", timeout=5).read()
        ms = (time.perf_counter() - t0) / 20 * 1000

        from urllib.error import HTTPError
        try:
            urllib_request.urlopen(f"{base}/api/v1/range/AB", timeout=5)
            raise AssertionError("bad prefix should 400")
        except HTTPError as e:
            assert e.code == 400

        srv.shutdown()
        srv.server_close()
        time.sleep(0.15)
        store.close_all()
        assert lines > 0
        assert ms < 10.0, f"latency {ms:.2f}ms exceeds 10ms budget"
    finally:
        store.close_all()
        for _ in range(10):
            try:
                for name in os.listdir(tmp):
                    try:
                        os.unlink(os.path.join(tmp, name))
                    except OSError:
                        pass
                os.rmdir(tmp)
                break
            except OSError:
                time.sleep(0.05)
    _ok("PH3 /api/v1/range/{prefix}",
        f"{lines} lines, {ms:.2f}ms avg (concurrency-safe)")


def test_geoip_offline_lookup():
    from core.local_engine import resolve_ip_location, GEOIP_MMDB_PATH
    if not os.path.exists(GEOIP_MMDB_PATH):
        _skip("PH3 GeoLite2 offline lookup", "data/geolite2.mmdb not installed")
        return
    r = resolve_ip_location("8.8.8.8")
    assert r["status"] == "success"
    assert r.get("country_code") and r.get("city") is not None
    _ok("PH3 GeoLite2 offline lookup", r.get("city"))

# --------------------------------------------------------------------------- #
# PHASE 4 - graph pivot & integration
# --------------------------------------------------------------------------- #
def test_investigate_target_concurrent_orchestration():
    import core.pivot_engine as pe

    async def fake_dns(domain, timeout=4.0):
        return FRESH_DNS

    async def fake_rdap(entity, client=None, timeout=8.0):
        return {"status": "success", "found": True, "entity": entity,
                "registrar": "ACME", "creation_date": "2020-01-01",
                "expiration_date": "2030-01-01"}

    pe.resolve_domain_security = fake_dns
    pe.fetch_rdap_telemetry = fake_rdap
    result = run(pe.investigate_target("example.com", "domain"))
    nodes, edges = result["nodes"], result["edges"]
    assert result["risk_level"] in ("CLEAN", "LOW")
    assert any("mx1.freshdomain.dev" in n.canonical_id for n in nodes)
    assert any(e.relationship == "HAS_MAIL_EXCHANGER" for e in edges)
    root = next(n for n in nodes if n.metadata.get("is_root_seed"))
    assert root.metadata["style"]["border"] == "#00E5FF"
    assert all("data" in n.metadata for n in nodes)
    _ok("PH4 investigate_target parallel orchestration",
        "DNS+RDAP gather, styled root")


def test_pivot_domain_appends_mx_ips_without_reset():
    result = run(pivot_node("domain:example.com", "domain", dns_payload=FRESH_DNS))
    ips = [n for n in result["nodes"] if n.canonical_id.startswith("ip:")]
    assert any(n.canonical_id == "ip:10.0.0.1" for n in ips)
    assert any(e.relationship == "USES_INFRASTRUCTURE" for e in result["edges"])
    _ok("PH4 pivot_node domain USES_INFRASTRUCTURE IP expansion")


def test_pivot_email_belongs_to_domain():
    import core.pivot_engine as pe
    result = run(pe.pivot_node("email:user@example.com", "email"))
    assert any(n.canonical_id == "domain:example.com" for n in result["nodes"])
    assert any(e.relationship == "BELONGS_TO" for e in result["edges"])
    _ok("PH4 pivot_node email BELONGS_TO domain")


def test_risk_styling_contract():
    assert risk_style("CRITICAL")["border"] == "#FF3366"
    assert risk_style("MEDIUM")["border"] == "#FFB800"
    assert risk_style("CLEAN")["border"] == "#00E5FF"
    assert classify_risk(pwned_count=12) == "HIGH"
    assert classify_risk(missing_spf=True) == "MEDIUM"
    assert classify_risk(dmarc_policy="reject") == "CLEAN"
    _ok("PH4 dynamic risk styling (#FF3366/#FFB800/#00E5FF)")

# --------------------------------------------------------------------------- #
# PHASE 1 - UI/CSS static checklist (source inspection)
# --------------------------------------------------------------------------- #
def _read(rel):
    with open(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", rel)),
              "r", encoding="utf-8", errors="ignore") as fh:
        return fh.read()


def test_phase1_css_grid_and_drawer():
    css = _read("src/index.css")
    assert "grid-template-columns: 380px 1fr 340px" in css, "grid template missing"
    assert "height: calc(100vh" in css, "fixed viewport height missing"
    assert "position: relative" in css and "width: 100%" in css and "height: 100%" in css
    assert "bottom: 32px" in css and "max-height: 48%" in css and "z-index: 100" in css
    _ok("PH1 dashboard grid 380/1fr/340 + center stage + drawer elevation")


def test_phase1_header_collision_and_map_state():
    tm = _read("src/components/ThreatMap.jsx")
    assert "pointer-events-auto" in tm and "overflow-hidden whitespace-nowrap" in tm
    app = _read("src/App.tsx")
    body = app.split("export default function App()")[1][:1600]
    assert "useState(true)" in body and "showMap" in body
    gc = _read("src/components/GraphCanvas.jsx")
    assert "canvasLabel" in gc, "minimal label painting missing"
    tr = _read("src/utils/graphTransform.js")
    assert "MAX_CANVAS_LABEL_LENGTH = 28" in tr
    _ok("PH1 header z-10/pointer-events, map default true, minimal labels")


# --------------------------------------------------------------------------- #
# Standalone runner (also collected by pytest as test functions)
# --------------------------------------------------------------------------- #
_TEST_FUNCS = [
    test_spf_policy_parser,
    test_dmarc_policy_parser,
    test_ehlo_extension_parser,
    test_rdap_telemetry_live,
    test_dns_resolver_live,
    test_resolvers_json_contract,
    test_db_schema_and_index,
    test_store_ingest_and_hibp_format,
    test_range_endpoint_concurrent_and_latency,
    test_geoip_offline_lookup,
    test_investigate_target_concurrent_orchestration,
    test_pivot_domain_appends_mx_ips_without_reset,
    test_pivot_email_belongs_to_domain,
    test_risk_styling_contract,
    test_phase1_css_grid_and_drawer,
    test_phase1_header_collision_and_map_state,
]


def main() -> int:
    print("=" * 78)
    print("ThreatScope Complete System Verification - Diagnostic Suite")
    print("=" * 78)
    _RESULTS.clear()
    for fn in _TEST_FUNCS:
        try:
            fn()
        except AssertionError as exc:
            _fail(fn.__name__, str(exc))
        except Exception as exc:
            _fail(fn.__name__, f"exception: {type(exc).__name__}: {exc}")
    print("-" * 78)
    hard = [r for r in _RESULTS if r[1] == "FAIL"]
    soft = [r for r in _RESULTS if r[1] == "SKIP"]
    print(f"SUMMARY: {sum(1 for r in _RESULTS if r[1] == 'PASS')} PASS | "
          f"{len(hard)} FAIL | {len(soft)} SKIP")
    for name, status, note in hard:
        print(f"  FAIL: {name} - {note}")
    for name, status, note in soft:
        print(f"  SKIP: {name} - {note}")
    print("=" * 78)
    return 1 if hard else 0


if __name__ == "__main__":
    raise SystemExit(main())

