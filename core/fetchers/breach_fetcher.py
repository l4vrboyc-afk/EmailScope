"""Breach & Identity Enrichment Fetcher.

Checks an email target against breach databases (HIBP v3 when an API key is
configured, with a privacy-preserving k-anonymity passive mode otherwise).
"""

from typing import Any, Dict, Optional

import httpx

from core.fetchers.base import BaseFetcher
from core.schemas import SeedInput, SeedType
from core.risk_scoring import breach_risk_index


class BreachFetcher(BaseFetcher):
    """Checks email target against breach databases (HIBP or fallback leak lookups)."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        timeout: float = 2.5,
        ka_client: Optional[Any] = None,
    ):
        super().__init__(name="Breach Exposure Fetcher", timeout=timeout)
        self.api_key = api_key
        # Optional shared :class:`core.kanonymity.KAnonymityClient` (reuses the
        # orchestrator's prefix LRU cache + rate limiter when provided).
        self._ka_client = ka_client

    async def _passive_k_anonymity_check(
        self, seed: SeedInput, client: httpx.AsyncClient
    ) -> Dict[str, Any]:
        """Keyless k-anonymity hash-prefix breach verification.

        Only the 5-character SHA-1 PREFIX ever crosses the network boundary —
        the plaintext target and full digest never leave this process. Any
        transport failure degrades to an explicit UNVERIFIED grace state so a
        restricted network never crashes the graph sweep.
        """
        from core.kanonymity import EntityType, KAnonymityClient

        result: Dict[str, Any] = {
            "status": "success",
            "breach_count": 0,
            "breaches": [],
        }

        # Bind to the caller's httpx client (MockTransport in tests, the
        # shared orchestrator client in production sweeps) so the range
        # query flows through the same transport/proxy configuration.
        ka = KAnonymityClient(client=client)
        try:
            telemetry = await ka.check(
                seed.value,
                node_id=f"{seed.seed_type.value}:{seed.value}",
                entity_type=EntityType.EMAIL,
            )
        except Exception as exc:  # noqa: BLE001 — fetchers never raise upstream
            result["status"] = "failed"
            result["reason"] = f"k-anonymity range query error: {exc}"
            result["k_anonymity"] = {
                "status": "unverified",
                "compromised": False,
                "pwned_count": 0,
                "threat_level": "UNVERIFIED",
                "entity_type": "email",
                "k_anonymity_bucket_size": 0,
                "cache_hit": False,
                "reason": str(exc),
            }
            return result
        finally:
            # Never close the caller's client — it is externally owned.
            await ka.aclose()

        # Expose the prefix-bucket breach telemetry: breach_count carries the
        # observed exposure count so risk scoring maps directly, and the full
        # k-anonymity payload rides along for the graph node metadata.
        result["breach_count"] = telemetry.pwned_count
        if telemetry.compromised:
            result["breaches"] = [
                {
                    "name": f"Pwned Passwords ({telemetry.pwned_count} exposures)",
                    "domain": "",
                    "breach_date": None,
                    "data_classes": ["Passwords"],
                    "k_anonymity": telemetry.as_metadata(),
                }
            ]
        result["k_anonymity"] = telemetry.as_metadata()
        if telemetry.status == "unverified":
            # Grace state — surface the degradation as a failed module sweep
            # (with the reason attached) so the UI renders UNVERIFIED styling.
            result["status"] = "failed"
            result["reason"] = telemetry.reason or "k-anonymity lookup unverified"
        return result

    async def fetch(self, seed: SeedInput, client: httpx.AsyncClient) -> Dict[str, Any]:
        if seed.seed_type != SeedType.EMAIL:
            return {"status": "skipped", "reason": "Requires email seed"}

        result: Dict[str, Any] = {
            "status": "success",
            "breach_count": 0,
            "breaches": [],
        }

        # No API key → privacy-preserving passive mode via the k-anonymity
        # hash-prefix range protocol (prefix-only on the wire, keyless API).
        if not self.api_key:
            return await self._passive_k_anonymity_check(seed, client)

        url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{seed.value}?truncateResponse=false"
        headers = {
            "hibp-api-key": self.api_key,
            "user-agent": "ThreatScope-OSINT",
        }

        try:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                breaches = response.json()
                result["breach_count"] = len(breaches)
                result["breaches"] = []
                for b in breaches:
                    breach_entry = {
                        "name": b.get("Name"),
                        "domain": b.get("Domain"),
                        "breach_date": b.get("BreachDate"),
                        "data_classes": b.get("DataClasses", []),
                    }
                    # Attach Data Class Risk Severity Index for frontend coloring
                    breach_entry["risk_index"] = breach_risk_index(
                        breach_entry["data_classes"]
                    )
                    result["breaches"].append(breach_entry)
            elif response.status_code == 404:
                result["breach_count"] = 0
            elif response.status_code == 429:
                result["status"] = "failed"
                result["reason"] = "Rate limited by HIBP API"
        except httpx.RequestError as e:
            result["status"] = "failed"
            result["reason"] = str(e)

        return result