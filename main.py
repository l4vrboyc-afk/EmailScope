"""ThreatScope Engine — Decoupled FastAPI Backend.

Production entry point for the decoupled deployment model:

    Vercel (React SPA)  -->  Docker/FastAPI (this service)  -->  local data engines

Wraps the existing ``core/`` investigation engines (DNS/RDAP/SMTP resolvers,
k-anonymity hash-range lookups, offline GeoIP, graph pivot synthesis) behind
a JSON HTTP API.

Configuration (all via environment variables)
----------------------------------------------
* ``ALLOWED_ORIGINS``   — comma-separated CORS origins
                           (default: http://localhost:5177,http://localhost:3000)
* ``DATA_DIR``          — absolute path for mutable intelligence data
                           (default: <repo>/data).  In Docker mount a volume here.
* ``HASH_DB_PATH``      — override path for the k-anonymity SQLite DB
* ``GEOIP_DB_PATH``     — override path for the GeoLite2 .mmdb
* ``PORT``              — uvicorn listen port (default 8000)
* ``HIBP_API_KEY``      — optional HaveIBeenPwned key for live breach lookups
"""

import os
from pathlib import Path
from typing import Any, Dict, List

import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #
DATA_DIR = Path(os.getenv("DATA_DIR", str(Path(__file__).parent / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

HASH_DB_PATH = Path(
    os.getenv("HASH_DB_PATH", str(DATA_DIR / "pwned_hashes.db"))
)
GEOIP_DB_PATH = Path(
    os.getenv("GEOIP_DB_PATH", str(DATA_DIR / "geolite2.mmdb"))
)

ALLOWED_ORIGINS: List[str] = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5177,http://localhost:3000"
    ).split(",")
    if o.strip()
]

HIBP_API_KEY = os.getenv("HIBP_API_KEY")

# --------------------------------------------------------------------------- #
# App + CORS
# --------------------------------------------------------------------------- #
app = FastAPI(
    title="ThreatScope Engine",
    version="1.0.0",
    description="OSINT investigation & breach-intelligence API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Lazy-loaded singletons (built on first request)
# --------------------------------------------------------------------------- #
_hash_store = None
_geoip_resolver = None


def get_hash_store():
    """Return (and lazily initialise) the local k-anonymity hash store."""
    global _hash_store
    if _hash_store is None:
        from core.local_engine import LocalKAnonymityStore

        _hash_store = LocalKAnonymityStore(str(HASH_DB_PATH))
    return _hash_store


def get_geoip_resolver():
    """Return (and lazily load) the offline GeoLite2 reader, if available."""
    global _geoip_resolver
    if _geoip_resolver is None:
        from core.local_engine import get_geoip_reader

        _geoip_resolver = get_geoip_reader()
    return _geoip_resolver


# --------------------------------------------------------------------------- #
# Request / response models
# --------------------------------------------------------------------------- #
class InvestigateRequest(BaseModel):
    target: str
    target_type: str = Field(default="domain", pattern="^(domain|email|ip)$")
    smtp_probe: bool = False


class PivotRequest(BaseModel):
    node_id: str
    pivot_type: str = Field(default="domain", pattern="^(domain|email|ip|mx)$")


class RangeResponse(BaseModel):
    prefix: str
    bucket_size: int
    body: str  # HIBP-standard "SUFFIX:COUNT" text
# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
@app.get("/health")
async def health() -> Dict[str, Any]:
    """Liveness probe + runtime configuration snapshot."""
    geoip = get_geoip_resolver()
    store = get_hash_store()
    return {
        "status": "ok",
        "data_dir": str(DATA_DIR),
        "hash_db": str(HASH_DB_PATH),
        "hash_db_records": store.total_records(),
        "geoip_available": geoip is not None,
        "geoip_path": str(GEOIP_DB_PATH),
        "allowed_origins": ALLOWED_ORIGINS,
    }


@app.post("/api/v1/investigate")
async def investigate(payload: InvestigateRequest) -> Dict[str, Any]:
    """Run a full parallel investigation (DNS + RDAP + GeoIP + k-anonymity)."""
    from core.pivot_engine import investigate_target

    try:
        result = await investigate_target(
            payload.target,
            payload.target_type,
            smtp_probe=payload.smtp_probe,
            geo_store=get_hash_store(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"investigation failed: {exc}") from exc

    return {
        "risk_level": result["risk_level"],
        "nodes": [n.model_dump(mode="json") for n in result["nodes"]],
        "edges": [e.model_dump(mode="json") for e in result["edges"]],
        "telemetry": result["telemetry"],
    }


@app.post("/api/v1/pivot")
async def pivot(payload: PivotRequest) -> Dict[str, Any]:
    """Expand an existing graph node (domain -> IPs, email -> domain)."""
    from core.pivot_engine import pivot_node

    try:
        result = await pivot_node(
            payload.node_id, payload.pivot_type, geo_store=get_hash_store()
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"pivot failed: {exc}") from exc

    return {
        "nodes": [n.model_dump(mode="json") for n in result["nodes"]],
        "edges": [e.model_dump(mode="json") for e in result["edges"]],
        "telemetry": result["telemetry"],
    }


@app.get("/api/v1/range/{prefix}")
async def range_query(prefix: str) -> RangeResponse:
    """Local k-anonymity hash-prefix range lookup (HIBP-standard format)."""
    if len(prefix) != 5 or not prefix.isalnum():
        raise HTTPException(
            status_code=400, detail="prefix must be exactly 5 hex characters"
        )
    body = get_hash_store().query_hash_prefix(prefix.upper())
    return RangeResponse(
        prefix=prefix.upper(),
        bucket_size=len(body.splitlines()) if body else 0,
        body=body,
    )


@app.get("/api/v1/resolve/{target_type}/{target}")
async def resolve(
    target_type: str, target: str, smtp_probe: bool = Query(default=False)
) -> Dict[str, Any]:
    """Run the native protocol resolvers (DNS, RDAP, optional SMTP)."""
    from core.resolvers import resolve_all

    if target_type not in ("domain", "email", "ip"):
        raise HTTPException(
            status_code=400, detail="target_type must be domain, email, or ip"
        )
    try:
        return await resolve_all(target, target_type, smtp_probe=smtp_probe)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"resolution failed: {exc}") from exc


@app.get("/api/v1/geoip/{ip}")
async def geoip(ip: str) -> Dict[str, Any]:
    """Offline GeoIP lookup against the local GeoLite2 database."""
    from core.local_engine import resolve_ip_location

    result = resolve_ip_location(ip)
    if result.get("status") != "success":
        raise HTTPException(
            status_code=503 if "not installed" in result.get("reason", "") else 404,
            detail=result.get("reason", "lookup failed"),
        )
    return result


# --------------------------------------------------------------------------- #
# Local dev entrypoint
# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=bool(os.getenv("UVICORN_RELOAD")),
    )

