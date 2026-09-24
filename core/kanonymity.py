"""K-Anonymity Hash-Prefix Range Query Engine — Privacy-Preserving Breach Verification.

Implements the Have-I-Been-Pwned style ``range/{PREFIX}`` protocol for
ThreatScope's breach enrichment pipeline.  The design guarantees that neither
the raw target secret (email, identifier, password, API key, token) nor its
full cryptographic hash ever leaves the local process boundary.

Protocol Flow
-------------
1. **Local normalization** — target strings are trimmed / case-folded and
   UTF-8 encoded deterministically before hashing.
2. **Local hashing** — SHA-1 (default, required by the HIBP range API) or
   SHA-256 is computed in-process.
3. **Prefix split** — the hex digest is split into a 5-character (20-bit)
   ``PREFIX`` bucket key and the remaining ``SUFFIX`` tail which stays in
   local memory.
4. **Range query** — ONLY the 5-character PREFIX is transmitted to the
   remote endpoint.  No headers, parameters or query strings ever carry the
   suffix, the digest length, or the plaintext input.  The ``Add-Padding``
   request header is set so compliant APIs pad the response to a uniform
   size, blinding payload-size traffic analysis.
5. **Stream verification** — the multiline ``SUFFIX:COUNT`` response body is
   parsed once into a byte-keyed mapping (minimal heap churn) and the local
   suffix is compared against every candidate with
   :func:`hmac.compare_digest` (constant-time evaluation, no early exit) to
   prevent value-dependent timing side channels.

Performance & Privacy Enhancements
----------------------------------
* **Prefix-level LRU cache with single-flight coalescing** — one range query
  returns ~400-800 candidate suffixes covering every future target sharing
  that prefix.  Concurrent graph expansions asking for the same prefix are
  coalesced onto a single in-flight request.
* **Pad-to-k buffering** — ``Add-Padding: true`` is always requested.
* **Bounded async workers** — bulk graph scans run through a semaphore with
  token-bucket rate limiting (:class:`core.ratelimit.TokenBucket`) and
  exponential backoff (honouring ``Retry-After``) on HTTP 429.
* **Zero-allocation-ish scanning** — the payload is decoded and split once;
  comparison operates on ``bytes`` keys without re-encoding per candidate.

Graph Integration
-----------------
:func:`KAnonymityClient.check` / ``check_batch`` emit normalized
:class:`NodeTelemetry` payloads ready to be merged into
:class:`core.schemas.GraphNode.metadata` so the frontend can map compromise
status directly to visual properties (border colour, weight, pulsing).

Failure Handling
----------------
Network errors, rate-limit exhaustion, or malformed responses degrade to a
**grace state** telemetry record (``status="unverified"``,
``threat_level=UNVERIFIED``) so restricted-network renders never crash the
graph engine.
"""

import asyncio
import hashlib
import hmac
from collections import OrderedDict
from enum import Enum
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import httpx
from pydantic import BaseModel, Field

from core.ratelimit import TokenBucket

__all__ = [
    "EntityType",
    "ThreatLevel",
    "NodeTelemetry",
    "PrefixBucket",
    "PrefixLRUCache",
    "HashSplit",
    "RangeQueryError",
    "KAnonymityClient",
    "split_hash",
    "parse_range_payload",
    "classify_threat",
]

# Default range-query endpoint (Pwned Passwords k-Anonymity API).
DEFAULT_RANGE_BASE_URL = "https://api.pwnedpasswords.com"

# 5 hex characters == 20 bits of bucket entropy (k-Anonymity prefix width).
PREFIX_LENGTH = 5

# Response-padding request header (uniform response sizes defeat
# payload-size traffic analysis on the wire).
PADDING_HEADER = "Add-Padding"

# Threat classification thresholds on pwned/observed counts.
THREAT_CRITICAL_THRESHOLD = 50
THREAT_HIGH_THRESHOLD = 10
THREAT_MEDIUM_THRESHOLD = 1


class EntityType(str, Enum):
    """Graph entity kinds the verifier can enrich."""

    EMAIL = "email"
    DOMAIN = "domain"
    HASH = "hash"


class ThreatLevel(str, Enum):
    """Visual severity tier mapped by the graph renderer to border colours."""

    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    CLEAN = "CLEAN"
    # Grace state: the check could not complete (offline / rate-limited).
    UNVERIFIED = "UNVERIFIED"


def classify_threat(pwned_count: int) -> ThreatLevel:
    """Map a raw breach observation count to a visual threat tier."""
    if pwned_count >= THREAT_CRITICAL_THRESHOLD:
        return ThreatLevel.CRITICAL
    if pwned_count >= THREAT_HIGH_THRESHOLD:
        return ThreatLevel.HIGH
    if pwned_count >= THREAT_MEDIUM_THRESHOLD:
        return ThreatLevel.MEDIUM
    return ThreatLevel.CLEAN


class NodeTelemetry(BaseModel):
    """Normalized per-node payload attached back to the graph engine.

    Mirrors the ThreatScope graph metadata contract so the React/WebGL
    renderer can drive border colour, node weight and centrality emphasis
    straight from these fields.
    """

    node_id: str
    entity_type: EntityType
    compromised: bool
    pwned_count: int = Field(ge=0)
    threat_level: ThreatLevel
    k_anonymity_bucket_size: int = Field(ge=0)
    cache_hit: bool = False
    # 'verified' = a live range query / cached bucket settled the verdict;
    # 'unverified' = graceful degradation (offline, throttled, malformed).
    status: str = "verified"
    reason: Optional[str] = None

    def as_metadata(self) -> Dict[str, Any]:
        """Flatten to a dict suitable for merging into ``GraphNode.metadata``."""
        return self.model_dump(mode="json")


class PrefixBucket:
    """A cached k-Anonymity bucket: suffix→count map for one 5-char prefix.

    Suffixes are stored as raw ``bytes`` keys so suffix comparison never
    re-allocates dynamic strings during scanning.
    """

    __slots__ = ("suffixes", "bucket_size")

    def __init__(self, suffixes: Dict[bytes, int]):
        self.suffixes = suffixes
        self.bucket_size = len(suffixes)

    def count_for(self, suffix: bytes) -> int:
        """Constant-time suffix scan (no early exit on match).

        Every candidate in the bucket is evaluated via
        :func:`hmac.compare_digest` and the results are accumulated, so the
        iteration profile is independent of *where* (or whether) the target
        suffix appears in the bucket.
        """
        count = 0
        for candidate, occurrences in self.suffixes.items():
            if hmac.compare_digest(suffix, candidate):
                count += occurrences
        return count


class PrefixLRUCache:
    """Bounded least-recently-used cache keyed on the 5-char PREFIX.

    A single bucket holds hundreds of candidate suffixes, so caching at the
    prefix level collapses whole families of overlapping organizational
    targets onto one network request.
    """

    def __init__(self, maxsize: int = 4096):
        self.maxsize = maxsize
        self._store: "OrderedDict[str, PrefixBucket]" = OrderedDict()
        self.hits = 0
        self.misses = 0

    def get(self, prefix: str) -> Optional[PrefixBucket]:
        bucket = self._store.get(prefix)
        if bucket is None:
            self.misses += 1
            return None
        self.hits += 1
        self._store.move_to_end(prefix)
        return bucket

    def put(self, prefix: str, bucket: PrefixBucket) -> None:
        if prefix in self._store:
            self._store.move_to_end(prefix)
        self._store[prefix] = bucket
        while len(self._store) > self.maxsize:
            self._store.popitem(last=False)

    def clear(self) -> None:
        self._store.clear()
        self.hits = 0
        self.misses = 0

    def __len__(self) -> int:
        return len(self._store)


class HashSplit:
    """Local-only hash material: the SUFFIX must never leave this process."""

    __slots__ = ("algorithm", "digest_hex", "prefix", "suffix")

    def __init__(self, algorithm: str, digest_hex: str):
        self.algorithm = algorithm
        self.digest_hex = digest_hex
        self.prefix = digest_hex[:PREFIX_LENGTH]
        self.suffix = digest_hex[PREFIX_LENGTH:]


def normalize_target(target: str, entity_type: EntityType) -> str:
    """Deterministic input normalization before hashing.

    Emails / domains are case-folded and trimmed (DNS identifiers are
    case-insensitive); raw hash material is only trimmed so its entropy is
    preserved exactly.
    """
    stripped = target.strip()
    if entity_type in (EntityType.EMAIL, EntityType.DOMAIN):
        return stripped.lower()
    return stripped


def split_hash(
    target: str,
    entity_type: EntityType = EntityType.HASH,
    algorithm: str = "sha1",
) -> HashSplit:
    """Hash *target* locally and split the hex digest into PREFIX / SUFFIX.

    Parameters
    ----------
    target:
        The raw identifier or secret.  Never logged, never transmitted.
    entity_type:
        Drives normalization (emails/domains are lowercased).
    algorithm:
        ``"sha1"`` (default — the format used by the HIBP range API) or
        ``"sha256"`` for stricter endpoints.
    """
    normalized = normalize_target(target, entity_type)
    try:
        hasher = hashlib.new(algorithm)
    except ValueError:
        raise ValueError(f"Unsupported hash algorithm: {algorithm!r}")
    hasher.update(normalized.encode("utf-8"))
    return HashSplit(algorithm, hasher.hexdigest().upper())


def parse_range_payload(payload: bytes) -> PrefixBucket:
    """Parse a multiline ``SUFFIX:COUNT`` response into a :class:`PrefixBucket`.

    The body is split and partitioned exactly once into ``bytes`` tokens —
    no per-candidate string re-allocations happen later during matching.
    Malformed lines (blank, missing separator, non-numeric count) are
    skipped defensively rather than crashing the scan.
    """
    suffixes: Dict[bytes, int] = {}
    for line in payload.split(b"\n"):
        line = line.strip()
        if not line:
            continue
        suffix, sep, raw_count = line.partition(b":")
        if not sep or not suffix:
            continue
        try:
            suffixes[suffix] = int(raw_count)
        except ValueError:
            continue
    return PrefixBucket(suffixes)


class RangeQueryError(RuntimeError):
    """Raised when a prefix range query cannot be completed."""

class KAnonymityClient:
    """Async k-Anonymity range-query client with caching, backoff & batching.

    Parameters
    ----------
    base_url:
        Root of the range endpoint; queries hit ``{base_url}/range/{PREFIX}``.
    client:
        Optional externally-owned :class:`httpx.AsyncClient` (e.g. the shared
        client the ThreatScope orchestrator already maintains).  When omitted
        a private client is created lazily and closed with :meth:`aclose`.
    cache:
        Optional externally-owned :class:`PrefixLRUCache` for sharing buckets
        across fetchers during a single investigation.
    rate / capacity:
        Token-bucket throttle applied to outbound range requests.
    max_retries / backoff_base:
        Exponential backoff policy for HTTP 429 responses.  A server-provided
        ``Retry-After`` always wins over the computed delay.
    """

    def __init__(
        self,
        base_url: str = DEFAULT_RANGE_BASE_URL,
        client: Optional[httpx.AsyncClient] = None,
        cache: Optional[PrefixLRUCache] = None,
        timeout: float = 5.0,
        rate: float = 8.0,
        capacity: int = 16,
        max_retries: int = 4,
        backoff_base: float = 0.5,
    ):
        self.base_url = base_url.rstrip("/")
        self._client = client
        self._owns_client = client is None
        self._timeout = timeout
        self.cache = cache if cache is not None else PrefixLRUCache()
        self._bucket_limiter = TokenBucket(rate=rate, capacity=capacity)
        self.max_retries = max_retries
        self.backoff_base = backoff_base
        # prefix -> in-flight request future (single-flight coalescing).
        self._inflight: Dict[str, "asyncio.Future"] = {}

    # ------------------------------------------------------------------ #
    # Client lifecycle
    # ------------------------------------------------------------------ #
    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self._timeout)
        return self._client

    async def aclose(self) -> None:
        if self._client is not None and self._owns_client:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> "KAnonymityClient":
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.aclose()

    # ------------------------------------------------------------------ #
    # Range query transport
    # ------------------------------------------------------------------ #
    @staticmethod
    def _request_headers() -> Dict[str, str]:
        """Privacy-hardened headers.

        Contains nothing derived from the target — no suffix, no digest
        length, no plaintext.  ``Add-Padding`` asks the API to pad the
        response to a uniform size to blunt payload-size side channels.
        """
        return {
            "user-agent": "ThreatScope-OSINT",
            "accept": "text/plain",
            PADDING_HEADER: "true",
        }

    async def _fetch_bucket(self, prefix: str) -> PrefixBucket:
        """Execute one rate-limited range query with exponential backoff."""
        url = f"{self.base_url}/range/{prefix}"
        last_error: Optional[str] = None

        for attempt in range(self.max_retries + 1):
            await self._bucket_limiter.acquire()
            try:
                response = await self._http().get(
                    url, headers=self._request_headers()
                )
            except httpx.RequestError as exc:
                # Transport-level failure — surface a graceful error upward;
                # retrying a dead route only delays the grace-state render.
                raise RangeQueryError(f"Range query transport error: {exc}") from exc

            if response.status_code == 200:
                return parse_range_payload(response.content)

            if response.status_code == 429:
                last_error = "Rate limited (HTTP 429) by range API"
                if attempt >= self.max_retries:
                    break
                retry_after = response.headers.get("retry-after")
                try:
                    delay = float(retry_after) if retry_after else 0.0
                except ValueError:
                    delay = 0.0
                delay = max(delay, self.backoff_base * (2**attempt))
                await asyncio.sleep(delay)
                continue

            raise RangeQueryError(
                f"Unexpected range API status {response.status_code}"
            )

        raise RangeQueryError(last_error or "Range query retries exhausted")



    async def get_bucket(self, prefix: str) -> Tuple[PrefixBucket, bool]:
        """Return the bucket for *prefix*, coalescing concurrent fetches.

        Returns ``(bucket, cache_hit)``.  Duplicate organizational targets
        sharing a prefix (or concurrent coroutines during a graph expansion)
        resolve against the local prefix store / in-flight request instead of
        duplicating network traffic.
        """
        cached = self.cache.get(prefix)
        if cached is not None:
            return cached, True

        fut = self._inflight.get(prefix)
        if fut is None:
            fut = asyncio.get_running_loop().create_future()
            self._inflight[prefix] = fut
            try:
                bucket = await self._fetch_bucket(prefix)
            except BaseException as exc:
                self._inflight.pop(prefix, None)
                # Wake coalesced waiters with the same failure; mark the
                # exception as retrieved so asyncio never logs a
                # "Future exception was never retrieved" warning when no
                # waiter was attached.
                if not fut.done():
                    fut.set_exception(exc)
                    fut.exception()
                raise
            else:
                self._inflight.pop(prefix, None)
                self.cache.put(prefix, bucket)
                if not fut.done():
                    fut.set_result(bucket)
                return bucket, False
        else:
            # Coalesced waiter — counts as a cache hit (prefix store reused).
            bucket = await fut
            return bucket, True

    # ------------------------------------------------------------------ #
    # Verification API
    # ------------------------------------------------------------------ #
    async def check(
        self,
        target: str,
        node_id: Optional[str] = None,
        entity_type: EntityType = EntityType.HASH,
        algorithm: str = "sha1",
    ) -> NodeTelemetry:
        """Verify a single target and return graph-ready telemetry.

        The full digest and the plaintext target never leave this process:
        only the 5-char PREFIX crosses the network boundary.
        """
        resolved_node_id = node_id if node_id is not None else target
        try:
            split = split_hash(target, entity_type=entity_type, algorithm=algorithm)
            bucket, cache_hit = await self.get_bucket(split.prefix)
        except RangeQueryError as exc:
            # Grace state — render the node without compromise claims.
            return NodeTelemetry(
                node_id=resolved_node_id,
                entity_type=entity_type,
                compromised=False,
                pwned_count=0,
                threat_level=ThreatLevel.UNVERIFIED,
                k_anonymity_bucket_size=0,
                cache_hit=False,
                status="unverified",
                reason=str(exc),
            )

        count = bucket.count_for(split.suffix.encode("ascii"))
        return NodeTelemetry(
            node_id=resolved_node_id,
            entity_type=entity_type,
            compromised=count > 0,
            pwned_count=count,
            threat_level=classify_threat(count),
            k_anonymity_bucket_size=bucket.bucket_size,
            cache_hit=cache_hit,
            status="verified",
        )

    async def check_batch(
        self,
        targets: Sequence[str],
        entity_type: EntityType = EntityType.HASH,
        node_ids: Optional[Iterable[str]] = None,
        algorithm: str = "sha1",
        max_concurrency: int = 8,
    ) -> List[NodeTelemetry]:
        """Verify many targets concurrently with bounded workers.

        Used for large topology scans (e.g. auditing 500+ emails harvested
        from a mapped domain).  Workers are bounded by a semaphore so the
        token bucket + coalescing cache throttle network expansion; every
        target independently degrades to grace state on failure.
        """
        id_list = list(node_ids) if node_ids is not None else list(targets)
        semaphore = asyncio.Semaphore(max(1, max_concurrency))

        async def worker(target: str, node_id: str) -> NodeTelemetry:
            async with semaphore:
                return await self.check(
                    target,
                    node_id=node_id,
                    entity_type=entity_type,
                    algorithm=algorithm,
                )

        return list(
            await asyncio.gather(
                *(worker(t, n) for t, n in zip(targets, id_list))
            )
        )
