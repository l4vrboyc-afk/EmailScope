"""Gravatar & Avatar Intelligence Fetcher.

Users link real names, primary handles, photos, and personal sites to the
MD5/SHA256 hash of their email. Gravatar's public profile endpoint exposes
this identity-rich data without authentication — a significant OSINT goldmine
for identity enrichment.
"""

import hashlib
from typing import Any, Dict

import httpx

from core.fetchers.base import BaseFetcher
from core.schemas import SeedInput, SeedType


class GravatarFetcher(BaseFetcher):
    """Fetches public Gravatar profiles and avatar metadata using email hashes."""

    def __init__(self, timeout: float = 2.5):
        super().__init__(name="Gravatar Identity Fetcher", timeout=timeout)

    async def fetch(self, seed: SeedInput, client: httpx.AsyncClient) -> Dict[str, Any]:
        if seed.seed_type != SeedType.EMAIL:
            return {"status": "skipped", "reason": "Requires email seed"}

        clean_email = seed.value.strip().lower()
        email_hash = hashlib.md5(clean_email.encode("utf-8")).hexdigest()  # noqa: S324 — Gravatar API requires MD5

        # Gravatar primary profile REST endpoint
        url = f"https://www.gravatar.com/{email_hash}.json"

        result = {
            "status": "success",
            "has_profile": False,
            "avatar_url": f"https://www.gravatar.com/avatar/{email_hash}?d=404",
            "display_name": None,
            "username": None,
            "location": None,
            "associated_urls": [],
        }

        try:
            response = await client.get(url, headers={"User-Agent": "ThreatScope-OSINT/1.0"})
            if response.status_code == 200:
                data = response.json()
                entry = data.get("entry", [{}])[0]

                result["has_profile"] = True
                result["display_name"] = entry.get("displayName")
                result["username"] = entry.get("preferredUsername")
                result["location"] = entry.get("currentLocation")

                # Extract external links attached to the target's Gravatar
                urls = entry.get("urls", [])
                result["associated_urls"] = [u.get("value") for u in urls if u.get("value")]
            elif response.status_code == 404:
                result["has_profile"] = False
            else:
                result["status"] = "failed"
                result["reason"] = f"HTTP {response.status_code}"
        except httpx.RequestError as e:
            result["status"] = "failed"
            result["reason"] = str(e)

        return result