"""Public Social & Cryptographic Identity Discovery fetcher.

Enumerates public identity footprint across:
- Keybase verified profile directory (Twitter, GitHub, Reddit, HN, crypto wallets)
- Public PGP Key Servers (keys.openpgp.org)
- Public developer & code commit registries.
"""

from typing import Any, Dict, List
import httpx

from core.fetchers.base import BaseFetcher
from core.schemas import SeedInput, SeedType


class SocialProfileFetcher(BaseFetcher):
    def __init__(self, timeout: float = 3.5):
        super().__init__(name="Public Social & Cryptographic Identity Fetcher", timeout=timeout)

    async def fetch(self, seed: SeedInput, client: httpx.AsyncClient) -> Dict[str, Any]:
        if seed.seed_type not in [SeedType.EMAIL, SeedType.USERNAME]:
            return {"status": "skipped", "reason": "Social discovery requires email or username"}

        identifier = seed.value.strip()
        username = identifier.split("@")[0] if seed.seed_type == SeedType.EMAIL else identifier

        result: Dict[str, Any] = {
            "status": "success",
            "identifier": identifier,
            "username_candidate": username,
            "keybase_profile": None,
            "pgp_keys": [],
            "discovered_accounts": [],
        }

        # 1. Query Keybase Public API
        keybase_param = f"email={identifier}" if seed.seed_type == SeedType.EMAIL else f"username={username}"
        keybase_url = f"https://keybase.io/_/api/1.0/user/lookup.json?{keybase_param}"

        try:
            kb_res = await client.get(keybase_url, timeout=self.timeout)
            if kb_res.status_code == 200:
                kb_data = kb_res.json()
                if kb_data.get("status", {}).get("code") == 0 and kb_data.get("them"):
                    them = kb_data["them"]
                    basics = them.get("basics", {})
                    kb_username = basics.get("username", username)
                    profile = {
                        "username": kb_username,
                        "full_name": them.get("profile", {}).get("full_name", ""),
                        "bio": them.get("profile", {}).get("bio", ""),
                        "location": them.get("profile", {}).get("location", ""),
                        "keybase_url": f"https://keybase.io/{kb_username}",
                    }
                    result["keybase_profile"] = profile

                    # Parse verified external services (proofs)
                    proofs = them.get("proofs_summary", {}).get("all", [])
                    for proof in proofs:
                        service = proof.get("proof_type", "")
                        handle = proof.get("nametag", "")
                        proof_url = proof.get("service_url", "")
                        if service and handle:
                            account_entry = {
                                "platform": service,
                                "handle": handle,
                                "url": proof_url,
                                "verified": True,
                            }
                            result["discovered_accounts"].append(account_entry)

                    # Check for PGP keys listed on Keybase
                    public_keys = them.get("public_keys", {}).get("pgp_public_keys", [])
                    for pkey in public_keys:
                        result["pgp_keys"].append({
                            "source": "Keybase",
                            "key_id": pkey.get("key_id", ""),
                            "fingerprint": pkey.get("key_fingerprint", ""),
                        })
        except Exception:
            pass

        # 2. Query Public PGP Keyserver (keys.openpgp.org) if email
        if seed.seed_type == SeedType.EMAIL:
            pgp_url = f"https://keys.openpgp.org/vks/v1/by-email/{identifier}"
            try:
                pgp_res = await client.get(pgp_url, timeout=self.timeout)
                if pgp_res.status_code == 200 and "BEGIN PGP PUBLIC KEY BLOCK" in pgp_res.text:
                    result["pgp_keys"].append({
                        "source": "keys.openpgp.org",
                        "email": identifier,
                        "has_public_key": True,
                        "key_url": pgp_url,
                    })
                    result["discovered_accounts"].append({
                        "platform": "OpenPGP Key Server",
                        "handle": identifier,
                        "url": pgp_url,
                        "verified": True,
                    })
            except Exception:
                pass

        # 3. Public GitHub check for username / email
        gh_url = f"https://api.github.com/users/{username}"
        try:
            gh_headers = {"User-Agent": "ThreatScope-OSINT", "Accept": "application/vnd.github.v3+json"}
            gh_res = await client.get(gh_url, headers=gh_headers, timeout=self.timeout)
            if gh_res.status_code == 200:
                gh_data = gh_res.json()
                result["discovered_accounts"].append({
                    "platform": "GitHub",
                    "handle": gh_data.get("login", username),
                    "name": gh_data.get("name", ""),
                    "bio": gh_data.get("bio", ""),
                    "company": gh_data.get("company", ""),
                    "location": gh_data.get("location", ""),
                    "url": gh_data.get("html_url", f"https://github.com/{username}"),
                    "verified": False,
                })
        except Exception:
            pass

        return result
