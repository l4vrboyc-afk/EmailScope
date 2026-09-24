"""Certificate Transparency (CT) Subdomain Fetcher.

Queries public Certificate Transparency logs (crt.sh) to enumerate
publicly registered subdomains, exposing shadow IT, auxiliary mail
servers, and development infrastructure.
"""

from typing import Any, Dict, List, Set
import httpx

from core.fetchers.base import BaseFetcher
from core.schemas import SeedInput, SeedType


class CertificateTransparencyFetcher(BaseFetcher):
    def __init__(self, timeout: float = 4.0):
        super().__init__(name="Certificate Transparency Subdomain Fetcher", timeout=timeout)

    async def fetch(self, seed: SeedInput, client: httpx.AsyncClient) -> Dict[str, Any]:
        if seed.seed_type not in [SeedType.DOMAIN, SeedType.EMAIL]:
            return {"status": "skipped", "reason": "Unsupported seed type"}

        domain = seed.value.split("@")[-1] if seed.seed_type == SeedType.EMAIL else seed.value
        domain = domain.lower().strip()

        result: Dict[str, Any] = {
            "status": "success",
            "domain": domain,
            "subdomain_count": 0,
            "subdomains": [],
            "mail_subdomains": [],
            "vpn_subdomains": [],
            "dev_subdomains": [],
            "admin_subdomains": [],
        }

        url = f"https://crt.sh/?q=%25.{domain}&output=json"

        try:
            headers = {
                "User-Agent": "ThreatScope-OSINT/1.0 (+https://github.com/threatscope)",
                "Accept": "application/json",
            }
            response = await client.get(url, headers=headers, timeout=self.timeout)

            if response.status_code == 200:
                data = response.json()
                discovered: Set[str] = set()

                if isinstance(data, list):
                    for entry in data:
                        name_val = entry.get("name_value", "")
                        if not name_val:
                            continue
                        # name_value can contain multiple domain lines or wildcards
                        for raw_name in name_val.split("\n"):
                            cleaned = raw_name.strip().lower().lstrip("*.")
                            if cleaned and (cleaned.endswith(f".{domain}") or cleaned == domain):
                                discovered.add(cleaned)

                # Sort discovered subdomains
                all_subdomains = sorted(list(discovered))
                result["subdomain_count"] = len(all_subdomains)
                result["subdomains"] = all_subdomains[:60]  # cap to top 60 for performance

                # Categorize subdomains for OSINT threat analysis
                for sub in all_subdomains:
                    prefix = sub.replace(f".{domain}", "")
                    if any(k in prefix for k in ["mail", "smtp", "imap", "pop", "webmail", "mx", "autodiscover"]):
                        result["mail_subdomains"].append(sub)
                    elif any(k in prefix for k in ["vpn", "remote", "gateway", "citrix", "access", "tunnel"]):
                        result["vpn_subdomains"].append(sub)
                    elif any(k in prefix for k in ["dev", "stage", "staging", "test", "uat", "internal", "sandbox"]):
                        result["dev_subdomains"].append(sub)
                    elif any(k in prefix for k in ["admin", "portal", "cpanel", "whm", "auth", "login"]):
                        result["admin_subdomains"].append(sub)

            else:
                result["status"] = "partial"
                result["note"] = f"crt.sh returned HTTP {response.status_code}"
        except Exception as e:
            result["status"] = "error"
            result["note"] = f"CT log query failed: {str(e)}"

        return result
