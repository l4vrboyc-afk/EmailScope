"""Local k-Anonymity Range Query Server (stdlib-only + Python 3.12).

Serves the HIBP-standard ``/api/v1/range/{prefix}`` endpoint backed by the
local SQLite :class:`core.local_engine.LocalKAnonymityStore`, so every
5-char prefix lookup stays fully self-hosted with zero network egress.

Endpoints
---------
    GET /api/v1/range/{PREFIX}   ->  200 "SUFFIX:COUNT\\n..." | 200 "" (unknown)
    GET /api/v1/stats            ->  JSON {total_records, ...}
    GET /                        ->  simple index listing

Run::

    python scripts/range_server.py [--db data/pwned_hashes.db] [--host 127.0.0.1] [--port 8050]
"""

import argparse
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.local_engine import LocalKAnonymityStore, DEFAULT_DB_PATH  # noqa: E402

SERVER_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Add-Padding",
    "Access-Control-Expose-Headers": "X-Prefix, X-Bucket-Size",
    "cache-control": "public, max-age=86400, stale-while-revalidate=86400",
}


def _make_handler(store: LocalKAnonymityStore):
    class RangeHandler(BaseHTTPRequestHandler):
        """HIBP-compatible range endpoint backed by the local SQLite store."""

        def do_OPTIONS(self) -> None:
            self.send_response(204)
            for key, value in SERVER_HEADERS.items():
                self.send_header(key, value)
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_GET(self) -> None:
            try:
                self._handle_get()
            except (BrokenPipeError, ConnectionResetError):
                pass  # client aborted — nothing to respond to
            except Exception as exc:  # never crash a worker thread
                self._send_json({"error": f"internal error: {exc}"}, status=500)

        def _handle_get(self) -> None:
            parsed = urlparse(self.path)
            path = parsed.path

            if path == "/" or path == "/api/v1":
                self._send_json(
                    {
                        "name": "ThreatScope Local k-Anonymity Range Server",
                        "endpoint": "GET /api/v1/range/{PREFIX}",
                        "total_records": store.total_records(),
                    }
                )
                return

            if path == "/api/v1/stats":
                self._send_json({"total_records": store.total_records(), "database": store.db_path})
                return

            if path.startswith("/api/v1/range/"):
                prefix = path.rsplit("/", 1)[-1].strip().upper()
                if len(prefix) != 5 or not prefix.isalnum():
                    self._send_json({"error": "prefix must be exactly 5 hex chars"}, status=400)
                    return
                body = store.query_hash_prefix(prefix)
                bucket_size = len(body.splitlines()) if body else 0
                self.send_response(200)
                for key, value in SERVER_HEADERS.items():
                    self.send_header(key, value)
                self.send_header("Content-Type", "text/plain")
                self.send_header("X-Prefix", prefix)
                self.send_header("X-Bucket-Size", str(bucket_size))
                payload = body.encode("ascii")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return

            self._send_json({"error": "not found"}, status=404)

        def _send_json(self, obj, status: int = 200) -> None:
            payload = json.dumps(obj).encode("utf-8")
            self.send_response(status)
            for key, value in SERVER_HEADERS.items():
                self.send_header(key, value)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def log_message(self, fmt: str, *args: object) -> None:
            sys.stderr.write(f"[range] {self.address_string()} {fmt % args}\n")

    return RangeHandler


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=DEFAULT_DB_PATH, help="SQLite database path")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8050)
    args = parser.parse_args()

    store = LocalKAnonymityStore(args.db)
    handler = _make_handler(store)
    server = ThreadingHTTPServer((args.host, args.port), handler)
    server.daemon_threads = True
    print(
        f"[range] serving {store.db_path} ({store.total_records():,} records) "
        f"at http://{args.host}:{args.port}/api/v1/range/{{PREFIX}}"
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[range] shutting down")
    finally:
        server.server_close()
        store.close_all()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
