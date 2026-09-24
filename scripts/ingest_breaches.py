"""High-speed breach-list ingestion pipeline for the local k-Anonymity store.

Reads raw HIBP-style leak files (``SHA1_HASH:COUNT`` per line) and bulk-loads
them into the SQLite :class:`core.local_engine.LocalKAnonymityStore` using
batched ``executemany`` transactions, splitting each SHA-1 into its
5-char prefix + 35-char suffix bucket.

Usage::

    python scripts/ingest_breaches.py path/to/leak1.txt [leak2.txt ...] [--db data/pwned_hashes.db]
"""

import argparse
import sys
import time
from pathlib import Path

# Allow `python scripts/ingest_breaches.py` from the repo root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.local_engine import LocalKAnonymityStore, DEFAULT_DB_PATH  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="+", help="Raw breach text files (SHA1_HASH:COUNT per line)")
    parser.add_argument("--db", default=DEFAULT_DB_PATH, help="Destination SQLite database path")
    parser.add_argument("--batch", type=int, default=5000, help="Batch commit size")
    args = parser.parse_args()

    store = LocalKAnonymityStore(args.db)
    started = time.monotonic()
    total = 0

    for file_path in args.files:
        if not Path(file_path).exists():
            print(f"[skip] missing file: {file_path}")
            continue
        t0 = time.perf_counter()
        with open(file_path, "r", encoding="utf-8", errors="ignore") as handle:
            file_total = store.ingest_lines(handle, batch_size=args.batch)
        elapsed = time.perf_counter() - t0
        total += file_total
        print(f"[ok] {Path(file_path).name}: {file_total:,} rows in {elapsed:.1f}s")
        print(
            f"     store now holds {store.total_records():,} records "
            f"({file_total / elapsed:,.0f} rows/sec)" if elapsed > 0 else ""
        )

    print(f"\nDone. Ingested {total:,} rows total in {time.monotonic() - started:.1f}s")
    store.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())