"""Tests for the k-Anonymity Hash-Prefix Range Query engine (core.kanonymity).

Covers:
* Exact matches with correct breach counts and threat classification.
* Uncompromised secrets (0 observations, CLEAN).
* Prefix-only network isolation (full hash / plaintext never transmitted).
* Prefix-level LRU caching + single-flight coalescing.
* HTTP 429 exponential backoff and rate-limit-exhausted grace state.
* Graceful network-failure handling (offline environments).
* Bounded batch (bulk graph scan) processing.
"""

import asyncio

import httpx
import pytest

from core.kanonymity import (
    EntityType,
    KAnonymityClient,
    PrefixLRUCache,
    RangeQueryError,
    ThreatLevel,
    parse_range_payload,
    split_hash,
)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def make_client(handler, **ka_kwargs) -> KAnonymityClient:
    """Build a KAnonymityClient bound to a MockTransport handler."""
    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport)
    defaults = dict(
        base_url="https://api.test",
        client=http,
        rate=1000.0,
        capacity=1000,
        backoff_base=0.0,  # no real sleeping in tests
    )
    defaults.update(ka_kwargs)
    return KAnonymityClient(**defaults)


def run(coro):
    return asyncio.run(coro)


def bucket_body_for(target: str, count: int, entity_type=EntityType.HASH) -> str:
    """Craft a `SUFFIX:COUNT` response body containing the target's suffix."""
    split = split_hash(target, entity_type=entity_type)
    lines = [f"{split.suffix}:{count}"]
    # Pad with decoy candidates so the bucket looks realistic.
    for i in range(3):
        lines.append(f"{'0123456789ABCDEF'[i] * 35}:{i + 1}")
    return "\n".join(lines) + "\n"

# --------------------------------------------------------------------------- #
# Hashing & prefix split
# --------------------------------------------------------------------------- #
def test_split_hash_prefix_is_five_chars_and_upper():
    split = split_hash("password123")
    assert split.algorithm == "sha1"
    assert split.prefix == "CBFDA"
    assert len(split.prefix) == 5
    assert len(split.suffix) == 35
    assert split.prefix + split.suffix == split.digest_hex


def test_split_hash_normalizes_email_case_and_whitespace():
    a = split_hash("  USER@Example.COM  ", entity_type=EntityType.EMAIL)
    b = split_hash("user@example.com", entity_type=EntityType.EMAIL)
    assert a.digest_hex == b.digest_hex


def test_split_hash_preserves_hash_material_case():
    a = split_hash("ABCDEF")
    b = split_hash("abcdef")
    assert a.digest_hex != b.digest_hex


def test_split_hash_sha256_supported():
    split = split_hash("password123", algorithm="sha256")
    assert len(split.digest_hex) == 64
    assert len(split.prefix) == 5
    assert len(split.suffix) == 59


def test_split_hash_rejects_unknown_algorithm():
    with pytest.raises(ValueError):
        split_hash("password123", algorithm="md5-fake")


# --------------------------------------------------------------------------- #
# Payload parsing
# --------------------------------------------------------------------------- #
def test_parse_range_payload_counts_and_skips_malformed_lines():
    body = b"AAAA1:375\n\nBBBB2:notanumber\nCCCC3:12\nno-separator\n"
    bucket = parse_range_payload(body)
    assert bucket.bucket_size == 2
    assert bucket.suffixes[b"AAAA1"] == 375
    assert bucket.suffixes[b"CCCC3"] == 12


def test_parse_range_payload_empty_body():
    assert parse_range_payload(b"").bucket_size == 0


# --------------------------------------------------------------------------- #
# Core verification flows
# --------------------------------------------------------------------------- #
def test_exact_match_returns_true_with_correct_count():
    target = "compromised-identity@example.com"
    prefix = split_hash(target, entity_type=EntityType.EMAIL).prefix
    seen_paths = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_paths.append(request.url.path)
        return httpx.Response(
            200, text=bucket_body_for(target, 2319, entity_type=EntityType.EMAIL)
        )

    ka = make_client(handler)
    telemetry = run(ka.check(target, entity_type=EntityType.EMAIL))

    assert telemetry.compromised is True
    assert telemetry.pwned_count == 2319
    assert telemetry.threat_level == ThreatLevel.CRITICAL
    assert telemetry.status == "verified"
    assert telemetry.k_anonymity_bucket_size == 4
    assert seen_paths == [f"/range/{prefix}"]
    run(ka.aclose())


def test_uncompromised_secret_returns_clean_zero():
    target = "totally-fresh@example.com"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, text=bucket_body_for(target, 0, entity_type=EntityType.EMAIL)
        )

    ka = make_client(handler)
    telemetry = run(ka.check(target, entity_type=EntityType.EMAIL))

    assert telemetry.compromised is False
    assert telemetry.pwned_count == 0
    assert telemetry.threat_level == ThreatLevel.CLEAN
    run(ka.aclose())


def test_threat_level_boundaries():
    from core.kanonymity import classify_threat

    assert classify_threat(0) is ThreatLevel.CLEAN
    assert classify_threat(1) is ThreatLevel.MEDIUM
    assert classify_threat(9) is ThreatLevel.MEDIUM
    assert classify_threat(10) is ThreatLevel.HIGH
    assert classify_threat(49) is ThreatLevel.HIGH
    assert classify_threat(50) is ThreatLevel.CRITICAL


# --------------------------------------------------------------------------- #
# Network isolation & privacy guarantees
# --------------------------------------------------------------------------- #
def test_only_prefix_crosses_the_wire_and_padding_requested():
    target = "sensitive-target@example.com"
    split = split_hash(target, entity_type=EntityType.EMAIL)
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["path"] = request.url.path
        captured["query"] = request.url.query
        captured["headers"] = dict(request.headers)
        captured["body"] = request.content
        return httpx.Response(
            200, text=bucket_body_for(target, 5, entity_type=EntityType.EMAIL)
        )

    ka = make_client(handler)
    telemetry = run(ka.check(target, entity_type=EntityType.EMAIL))

    assert telemetry.status == "verified"
    # Exactly the 5-char prefix in the path, nothing else.
    assert captured["path"] == f"/range/{split.prefix}"
    # No query strings, empty body, no suffix or digest anywhere on the wire.
    assert captured["query"] == b""
    assert captured["body"] == b""
    wire_text = (captured["path"] + str(captured["headers"])).upper()
    assert split.suffix not in wire_text
    assert split.digest_hex not in wire_text
    assert target.split("@")[0].upper() not in wire_text
    # Pad-to-k traffic-analysis mitigation requested.
    assert captured["headers"].get("add-padding") == "true"
    assert captured["headers"].get("user-agent") == "ThreatScope-OSINT"
    run(ka.aclose())


# --------------------------------------------------------------------------- #
# Caching & deduplication
# --------------------------------------------------------------------------- #
def test_repeat_prefix_served_from_lru_cache_single_http_call():
    target = "alpha@example.com"
    call_count = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        call_count["n"] += 1
        return httpx.Response(
            200, text=bucket_body_for(target, 7, entity_type=EntityType.EMAIL)
        )

    ka = make_client(handler)
    t1 = run(ka.check(target, entity_type=EntityType.EMAIL))
    t2 = run(ka.check(target, entity_type=EntityType.EMAIL))
    assert t1.cache_hit is False
    assert t2.cache_hit is True
    assert call_count["n"] == 1

    prefix = split_hash(target, entity_type=EntityType.EMAIL).prefix
    assert len(ka.cache) == 1
    assert ka.cache.get(prefix) is not None
    run(ka.aclose())


def test_lru_cache_eviction_respects_maxsize():
    from core.kanonymity import PrefixBucket

    cache = PrefixLRUCache(maxsize=2)
    for p in ("AAAAA", "BBBBB", "CCCCC"):
        cache.put(p, PrefixBucket({}))
    assert len(cache) == 2
    assert cache.get("AAAAA") is None  # oldest evicted
    assert cache.get("CCCCC") is not None


# --------------------------------------------------------------------------- #
# Failure handling & grace state
# --------------------------------------------------------------------------- #
def test_rate_limit_backoff_then_success():
    target = "throttled@example.com"
    attempts = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        attempts["n"] += 1
        if attempts["n"] == 1:
            return httpx.Response(429, headers={"retry-after": "0"})
        return httpx.Response(
            200, text=bucket_body_for(target, 3, entity_type=EntityType.EMAIL)
        )

    ka = make_client(handler, max_retries=3, backoff_base=0.0)
    telemetry = run(ka.check(target, entity_type=EntityType.EMAIL))

    assert attempts["n"] == 2
    assert telemetry.status == "verified"
    assert telemetry.compromised is True
    assert telemetry.pwned_count == 3
    run(ka.aclose())


def test_rate_limit_exhaustion_degrades_to_grace_state():
    target = "always-throttled@example.com"
    attempts = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        attempts["n"] += 1
        return httpx.Response(429)

    ka = make_client(handler, max_retries=2, backoff_base=0.0)
    telemetry = run(ka.check(target, entity_type=EntityType.EMAIL))

    assert attempts["n"] == 3  # initial + 2 retries
    assert telemetry.status == "unverified"
    assert telemetry.compromised is False
    assert telemetry.threat_level == ThreatLevel.UNVERIFIED
    assert telemetry.reason is not None
    run(ka.aclose())


def test_network_error_degrades_to_grace_state():
    target = "offline@example.com"

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Network unreachable")

    ka = make_client(handler)
    telemetry = run(ka.check(target, entity_type=EntityType.EMAIL))

    assert telemetry.status == "unverified"
    assert telemetry.compromised is False
    assert telemetry.pwned_count == 0
    assert telemetry.threat_level == ThreatLevel.UNVERIFIED
    assert "transport error" in telemetry.reason.lower()
    run(ka.aclose())


def test_unexpected_status_raises_range_query_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503)

    ka = make_client(handler)
    with pytest.raises(RangeQueryError):
        run(ka.get_bucket("ABCDE"))
    run(ka.aclose())


# --------------------------------------------------------------------------- #
# Bulk / batch processing
# --------------------------------------------------------------------------- #
def test_batch_processes_all_targets_with_bounded_concurrency():
    targets = [f"bulk{i}@example.com" for i in range(12)]
    inflight = {"peak": 0, "current": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        inflight["current"] += 1
        inflight["peak"] = max(inflight["peak"], inflight["current"])
        try:
            # Only targets[0]'s suffix is in the bucket; the rest are CLEAN.
            return httpx.Response(
                200,
                text=bucket_body_for(targets[0], 1, entity_type=EntityType.EMAIL),
            )
        finally:
            inflight["current"] -= 1

    ka = make_client(handler)
    telemetries = run(ka.check_batch(targets, entity_type=EntityType.EMAIL))

    assert len(telemetries) == len(targets)
    assert all(t.status == "verified" for t in telemetries)
    assert telemetries[0].compromised is True
    assert telemetries[0].pwned_count == 1
    assert all(not t.compromised for t in telemetries[1:])
    # Node IDs default to the target strings, in order.
    assert [t.node_id for t in telemetries] == targets
    assert inflight["peak"] <= 8  # bounded workers
    run(ka.aclose())


def test_batch_partial_failure_keeps_healthy_results():
    targets = ["good1@example.com", "dead@example.com", "good2@example.com"]
    dead_prefix = split_hash(targets[1], entity_type=EntityType.EMAIL).prefix

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith(dead_prefix):
            raise httpx.ConnectError("Route down")
        return httpx.Response(
            200, text=bucket_body_for(targets[0], 2, entity_type=EntityType.EMAIL)
        )

    ka = make_client(handler)
    telemetries = run(ka.check_batch(targets, entity_type=EntityType.EMAIL))

    assert telemetries[0].status == "verified"
    assert telemetries[1].status == "unverified"
    assert telemetries[2].status == "verified"
    run(ka.aclose())


# --------------------------------------------------------------------------- #
# Constant-time matching (structural smoke test)
# --------------------------------------------------------------------------- #
def test_suffix_scan_evaluates_entire_bucket():
    from core.kanonymity import PrefixBucket

    bucket = PrefixBucket({b"A" * 35: 5, b"B" * 35: 7, b"C" * 35: 11})
    assert bucket.count_for(b"B" * 35) == 7
    assert bucket.count_for(b"Z" * 35) == 0


# --------------------------------------------------------------------------- #
# BreachFetcher k-anonymity passive-mode integration
# --------------------------------------------------------------------------- #
def test_breach_fetcher_passive_mode_uses_k_anonymity_range_query():
    from core.fetchers.breach_fetcher import BreachFetcher
    from core.schemas import SeedInput, SeedType

    target = "investigate-me@example.com"
    prefix = split_hash(target, entity_type=EntityType.EMAIL).prefix
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["path"] = request.url.path
        return httpx.Response(
            200, text=bucket_body_for(target, 60, entity_type=EntityType.EMAIL)
        )

    transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(transport=transport)
    fetcher = BreachFetcher(api_key=None, timeout=5.0)
    seed = SeedInput(value=target, seed_type=SeedType.EMAIL)

    result = run(fetcher.fetch(seed, client))

    assert result["status"] == "success"
    assert result["breach_count"] == 60
    assert seen["path"] == f"/range/{prefix}"  # prefix only on the wire
    ka_meta = result["k_anonymity"]
    assert ka_meta["compromised"] is True
    assert ka_meta["pwned_count"] == 60
    assert ka_meta["threat_level"] == "CRITICAL"
    assert ka_meta["entity_type"] == "email"
    assert ka_meta["k_anonymity_bucket_size"] == 4
    run(client.aclose())


def test_breach_fetcher_passive_mode_grace_state_on_network_failure():
    from core.fetchers.breach_fetcher import BreachFetcher
    from core.schemas import SeedInput, SeedType

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("No route to host")

    transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(transport=transport)
    fetcher = BreachFetcher(api_key=None, timeout=5.0)
    seed = SeedInput(value="x@example.com", seed_type=SeedType.EMAIL)

    result = run(fetcher.fetch(seed, client))

    assert result["status"] == "failed"
    assert result["breach_count"] == 0
    assert result["k_anonymity"]["status"] == "unverified"
    assert result["k_anonymity"]["threat_level"] == "UNVERIFIED"
    assert "reason" in result
    run(client.aclose())

