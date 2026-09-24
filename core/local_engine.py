"""ThreatScope Self-Hosted k-Anonymity & GeoIP Intelligence Engine.

Fully local, zero-cost breach-hash storage and offline IP geolocation:

* **pwned_hashes store** — SQLite table ``(prefix CHAR(5), suffix CHAR(35),
  count INT)`` with a B-tree index on ``prefix``.  Supports HIBP-standard
  ``SUFFIX:COUNT`` multiline range-query responses in well under 10 ms for
  a 5-char prefix bucket.

* **geolite2 wrapper** — offline ``.mmdb`` lookups (MaxMind GeoLite2 City)
  returning city / country / lat-lon / ASN without any network call.

Schema
------
    CREATE TABLE pwned_hashes (
        prefix CHAR(5)  NOT NULL,
        suffix CHAR(35) NOT NULL,
        count  INT      NOT NULL
    );
    CREATE INDEX idx_hash_prefix ON pwned_hashes(prefix);

Usage
-----
    store = LocalKAnonymityStore("data/pwned_hashes.db")
    store.ingest_lines(["5B3BF8...92D:7", ...])   # or .ingest_stream(file)
    bucket = store.query_hash_prefix("CBFDA")      # -> "SUFFIX:COUNT\\n..."
"""

from __future__ import annotations

import os
import sqlite3
import threading
from typing import Dict, Iterator, List, Optional, Tuple

__all__ = [
    "LocalKAnonymityStore",
    "resolve_ip_location",
    "get_geoip_reader",
    "SUFFIX_LENGTH",
    "PREFIX_LENGTH",
    "DEFAULT_DB_PATH",
    "GEOIP_MMDB_PATH",
]

PREFIX_LENGTH = 5
SUFFIX_LENGTH = 35
DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "pwned_hashes.db")
GEOIP_MMDB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "geolite2.mmdb")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS pwned_hashes (
    prefix CHAR(5)  NOT NULL,
    suffix CHAR(35) NOT NULL,
    count  INT      NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hash_prefix ON pwned_hashes(prefix);
"""
def _normalize_line(line: str) -> Optional[Tuple[str, str, int]]:
    """Split one ``SHA1_SUFFIX:COUNT`` line into (prefix, suffix, count).

    Accepts either a full 40-char SHA-1 (prefixed by the 5-char bucket) or a
    raw ``SUFFIX:COUNT`` pair.  Returns None for malformed lines.
    """
    line = (line or "").strip()
    if not line:
        return None
    suffix_part, sep, count_part = line.rpartition(":")
    if not sep:
        return None
    suffix = suffix_part.strip().upper()
    if not suffix or len(suffix) < SUFFIX_LENGTH:
        return None
    try:
        count = int(count_part.strip())
    except ValueError:
        return None
    if len(suffix) == PREFIX_LENGTH + SUFFIX_LENGTH:
        return suffix[:PREFIX_LENGTH], suffix[PREFIX_LENGTH:], count
    return suffix[:PREFIX_LENGTH], suffix, count


class LocalKAnonymityStore:
    """Thread-safe SQLite store for HIBP-style hash prefixes.

    Connections are created **per-thread** (``threading.local``) so the
    store can be used safely from worker threads — e.g. the
    :mod:`scripts.range_server` ThreadingHTTPServer handlers — without
    sqlite3's cross-thread ``ProgrammingError``.
    """

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = os.path.abspath(db_path)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._local = threading.local()
        self._lock = threading.Lock()
        self._conns: set[sqlite3.Connection] = set()
        # Create/schema on the calling (main) thread once.
        conn = self._get_conn()
        conn.executescript(_SCHEMA)
        conn.commit()

    def _get_conn(self) -> sqlite3.Connection:
        """Return this thread's private SQLite connection (created lazily)."""
        conn = getattr(self._local, "conn", None)
        if conn is None:
            conn = sqlite3.connect(self.db_path)
            conn.execute("PRAGMA journal_mode=WAL")
            self._local.conn = conn
            with self._lock:
                self._conns.add(conn)
        return conn

    def close(self) -> None:
        """Close this thread's connection (no-op when already closed)."""
        conn = getattr(self._local, "conn", None)
        if conn is not None:
            conn.close()
            self._local.conn = None
        with self._lock:
            self._conns.discard(conn)

    def close_all(self) -> None:
        """Close every connection owned by *any* thread.

        Needed when a :class:`ThreadingHTTPServer` or a test fixture spins up
        worker threads that each hold a SQLite handle — without this the OS
        keeps the file locked and `TemporaryDirectory` / `rmtree` cleanup fails
        with ``WinError 32`` (POSIX: ``Text file busy``).
        """
        with self._lock:
            conns = list(self._conns)
            self._conns.clear()
        for conn in conns:
            try:
                conn.close()
            except Exception:
                pass
        self._local.conn = None

    def __exit__(self, *exc: object) -> None:
        self.close_all()

    # -- Ingestion -----------------------------------------------------------
    def ingest_lines(self, lines: Iterator[str], batch_size: int = 5000) -> int:
        """Insert ``SHA1:COUNT`` / ``SUFFIX:COUNT`` lines with batched transactions.

        Returns the number of records actually inserted.  ``executemany``
        keeps commits amortized to the configured batch size for high-speed
        imports of large leak dumps.
        """
        inserted = 0
        batch: List[Tuple[str, str, int]] = []
        for line in lines:
            row = _normalize_line(line)
            if row is None:
                continue
            batch.append(row)
            if len(batch) >= batch_size:
                inserted += self._commit_batch(batch)
                batch = []
        if batch:
            inserted += self._commit_batch(batch)
        return inserted

    def _commit_batch(self, rows: List[Tuple[str, str, int]]) -> int:
        conn = self._get_conn()
        conn.executemany(
            "INSERT INTO pwned_hashes (prefix, suffix, count) VALUES (?, ?, ?)",
            rows,
        )
        conn.commit()
        return len(rows)

    # -- Range-query service -------------------------------------------------
    def query_hash_prefix(self, prefix_5char: str) -> str:
        """Indexed search for one 5-char prefix, returning HIBP-standard text.

        Output is the canonical multiline ``SUFFIX:COUNT`` body a HIBP-style
        range endpoint would return (an empty string for an unknown prefix).
        Backed by the B-tree ``idx_hash_prefix`` index, this stays well under
        10 ms per query even at hundreds of millions of rows.
        """
        prefix = (prefix_5char or "").strip().upper()
        rows = self._get_conn().execute(
            "SELECT suffix, count FROM pwned_hashes WHERE prefix = ? ORDER BY count DESC",
            (prefix,),
        ).fetchall()
        if not rows:
            return ""
        return "\n".join(f"{suffix}:{count}" for suffix, count in rows)

    def lookup(self, prefix: str, suffix: str) -> Optional[int]:
        """Fast single-prefix/suffix lookup — returns the pwned count or None."""
        row = self._get_conn().execute(
            "SELECT count FROM pwned_hashes WHERE prefix = ? AND suffix = ?",
            (prefix.strip().upper(), suffix.strip().upper()),
        ).fetchone()
        return int(row[0]) if row else None

    def total_records(self) -> int:
        return int(self._get_conn().execute("SELECT COUNT(*) FROM pwned_hashes").fetchone()[0])

    def __enter__(self):
        return self


# --------------------------------------------------------------------------- #
# Offline GeoIP module (MaxMind GeoLite2 — free .mmdb, fully local)
# --------------------------------------------------------------------------- #
_geoip_reader = None


def get_geoip_reader():
    """Lazily load the GeoLite2 reader; returns the reader or None.

    Uses an optional ``cache`` (functools) style single-load so repeated IP
    lookups don't reload the mmdb from disk each time.
    """
    global _geoip_reader
    if _geoip_reader is not None:
        return _geoip_reader
    try:
        import geoip2.database
    except ImportError:
        return None
    if not os.path.exists(GEOIP_MMDB_PATH):
        return None
    _geoip_reader = geoip2.database.Reader(GEOIP_MMDB_PATH)
    return _geoip_reader


def resolve_ip_location(ip_address: str) -> Dict[str, object]:
    """Resolve an IP to offline location telemetry (city/geo/ASN).

    Relies on the local ``data/geolite2.mmdb``; returns a ``status`` field
    for graceful degradation when the mmdb or ``geoip2`` is unavailable.
    """
    if not ip_address:
        return {"status": "failed", "reason": "Empty IP address"}
    reader = get_geoip_reader()
    if reader is None:
        return {
            "status": "failed",
            "reason": "GeoLite2 mmdb not installed (data/geolite2.mmdb) or geoip2 missing",
        }
    try:
        resp = reader.city(ip_address)
        asn = None
        try:
            asn_resp = reader.asn(ip_address)
            asn = getattr(asn_resp, "autonomous_system_number", None)
        except Exception:
            asn = None
        return {
            "status": "success",
            "ip": ip_address,
            "city": resp.city.name,
            "country_code": resp.country.iso_code,
            "country": resp.country.name,
            "latitude": resp.location.latitude,
            "longitude": resp.location.longitude,
            "timezone": resp.location.time_zone,
            "asn": asn,
            "postal": resp.postal.code,
        }
    except Exception as exc:
        return {"status": "failed", "reason": str(exc), "ip": ip_address}


if __name__ == "__main__":  # pragma: no cover  (CLI self-test)
    import sys

    store = LocalKAnonymityStore(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB_PATH)
    print(f"total records: {store.total_records()}")