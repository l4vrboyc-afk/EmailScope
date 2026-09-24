"""DNS & Email Authentication fetcher module.

Checks MX records, SPF policies, DMARC alignment, and BIMI records using
dnspython's asynchronous DNS resolver.

Beyond raw record listings, this module derives an **Email Infrastructure
Hygiene Vector**: a domain that accepts mail (MX present) yet publishes no
SPF and no DMARC is trivially spoofable — a prime vector for BEC (Business
Email Compromise). Such domains are flagged as ``spoofing_vulnerability:
HIGH`` so analysts immediately recognize forged-email risk.
"""

import dns.asyncresolver
import dns.exception
import dns.resolver
import httpx
from typing import Any, Dict

from core.fetchers.base import BaseFetcher
from core.schemas import SeedInput, SeedType


class DNSFetcher(BaseFetcher):
    def __init__(self, timeout: float = 2.5):
        super().__init__(name="DNS & Email Auth Fetcher", timeout=timeout)

    async def fetch(self, seed: SeedInput, client: httpx.AsyncClient) -> Dict[str, Any]:
        # Only process DOMAIN or EMAIL seeds
        if seed.seed_type not in [SeedType.DOMAIN, SeedType.EMAIL]:
            return {"status": "skipped", "reason": "Unsupported seed type"}

        domain = seed.value.split("@")[-1] if seed.seed_type == SeedType.EMAIL else seed.value
        resolver = dns.asyncresolver.Resolver()
        resolver.lifetime = self.timeout

        result = {
            "status": "success",
            "domain": domain,
            "mx_records": [],
            "has_spf": False,
            "spf_record": None,
            "has_dmarc": False,
            "dmarc_record": None,
            "has_bimi": False,
            "bimi_record": None,
        }

        # Query MX Records
        try:
            mx_answers = await resolver.resolve(domain, "MX")
            result["mx_records"] = [str(r.exchange).rstrip(".") for r in mx_answers]
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout):
            pass

        # Query TXT Records for SPF
        try:
            txt_answers = await resolver.resolve(domain, "TXT")
            for rdata in txt_answers:
                txt_string = "".join([b.decode("utf-8", errors="ignore") for b in rdata.strings])
                if txt_string.startswith("v=spf1"):
                    result["has_spf"] = True
                    result["spf_record"] = txt_string
                    break
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout):
            pass

        # Query DMARC Record
        try:
            dmarc_domain = f"_dmarc.{domain}"
            dmarc_answers = await resolver.resolve(dmarc_domain, "TXT")
            for rdata in dmarc_answers:
                txt_string = "".join([b.decode("utf-8", errors="ignore") for b in rdata.strings])
                if txt_string.startswith("v=DMARC1"):
                    result["has_dmarc"] = True
                    result["dmarc_record"] = txt_string
                    break
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout):
            pass

        # Query BIMI Record (Brand Indicators for Message Identification)
        try:
            bimi_domain = f"_bimi.{domain}"
            bimi_answers = await resolver.resolve(bimi_domain, "TXT")
            for rdata in bimi_answers:
                txt_string = "".join([b.decode("utf-8", errors="ignore") for b in rdata.strings])
                if txt_string.startswith("v=BIMI1"):
                    result["has_bimi"] = True
                    result["bimi_record"] = txt_string
                    break
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout):
            pass

        self._apply_hygiene_vector(result)

        return result

    @staticmethod
    def _apply_hygiene_vector(result: Dict[str, Any]) -> None:
        """Derive an Email Infrastructure Hygiene Vector and flag spoofing risk.

        The core rule (BEC / spoofing detection): if the domain accepts mail
        (MX present) but publishes neither SPF nor DMARC, forged emails can be
        sent with that identity — mark ``spoofing_vulnerability: HIGH``.
        """
        mx_present = bool(result["mx_records"])
        spf_present = result["has_spf"]
        dmarc_present = result["has_dmarc"]
        bimi_present = bool(result["has_bimi"])

        if not mx_present:
            vulnerability = "UNKNOWN"
            note = (
                "No MX records found; the domain does not advertise mail "
                "delivery, so SPF/DMARC enforcement cannot be assessed here."
            )
        elif not spf_present and not dmarc_present:
            vulnerability = "HIGH"
            note = (
                "Domain accepts mail (MX present) but publishes no SPF and no "
                "DMARC. Forged emails can be sent under this identity — a "
                "prime target for spoofing and Business Email Compromise (BEC)."
            )
        elif spf_present != dmarc_present:
            vulnerability = "MEDIUM"
            note = (
                "Domain accepts mail but only one of SPF/DMARC is published. "
                "A partial configuration leaves a spoofing gap that attackers "
                "can still exploit."
            )
        else:
            vulnerability = "LOW"
            note = (
                "Both SPF and DMARC are published for a mail-accepting domain; "
                "spoofing resistance is configured."
            )

        bimi_note = (
            f" BIMI is {'published' if bimi_present else 'not published'}."
        )

        result["spoofing_vulnerability"] = vulnerability
        result["hygiene_vector"] = {
            "mx_present": mx_present,
            "spf_present": spf_present,
            "dmarc_present": dmarc_present,
            "bimi_present": bimi_present,
            "spoofing_vulnerability": vulnerability,
            "note": note + bimi_note,
        }
