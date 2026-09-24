"""IP Geolocation and Infrastructure Threat Intelligence fetcher.

Resolves geographic coordinates (Latitude, Longitude), Country, City,
ISP, ASN, and detects proxy, VPN, or datacenter hosting indicators.
"""

from typing import Any, Dict
import httpx

from core.fetchers.base import BaseFetcher
from core.schemas import SeedInput, SeedType


class GeoIPFetcher(BaseFetcher):
    def __init__(self, timeout: float = 3.0):
        super().__init__(name="IP Geolocation & Threat Intelligence Fetcher", timeout=timeout)

    async def fetch(self, seed: SeedInput, client: httpx.AsyncClient) -> Dict[str, Any]:
        # Accepts IP seeds directly
        if seed.seed_type != SeedType.IP:
            return {"status": "skipped", "reason": "GeoIP requires an IP seed"}

        ip = seed.value.strip()
        return await self.lookup_ip(ip, client)

    async def lookup_ip(self, ip: str, client: httpx.AsyncClient) -> Dict[str, Any]:
        """Lookup geolocation and ASN details for a specific IP address."""
        result: Dict[str, Any] = {
            "status": "success",
            "ip": ip,
            "country": "Unknown",
            "country_code": "",
            "region": "",
            "city": "Unknown",
            "latitude": 0.0,
            "longitude": 0.0,
            "timezone": "",
            "isp": "Unknown",
            "org": "Unknown",
            "asn": "Unknown",
            "is_datacenter": False,
            "is_proxy": False,
        }

        # Ignore private/bogon IPs
        if ip.startswith(("10.", "192.168.", "172.16.", "127.", "0.", "fe80:", "::1")):
            result["status"] = "private"
            result["note"] = "Private/Internal RFC-1918 or loopback IP"
            return result

        # Primary provider: ip-api.com
        url = f"http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,regionName,city,lat,lon,timezone,isp,org,as,hosting,proxy,query"

        try:
            response = await client.get(url, timeout=self.timeout)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    result["country"] = data.get("country", "Unknown")
                    result["country_code"] = data.get("countryCode", "")
                    result["region"] = data.get("regionName", "")
                    result["city"] = data.get("city", "Unknown")
                    result["latitude"] = float(data.get("lat", 0.0))
                    result["longitude"] = float(data.get("lon", 0.0))
                    result["timezone"] = data.get("timezone", "")
                    result["isp"] = data.get("isp", "Unknown")
                    result["org"] = data.get("org", "Unknown")
                    result["asn"] = data.get("as", "Unknown")
                    result["is_datacenter"] = bool(data.get("hosting", False))
                    result["is_proxy"] = bool(data.get("proxy", False))
                    return result
        except Exception:
            pass

        # Fallback provider: ipwhois.app
        fallback_url = f"https://ipwhois.app/json/{ip}"
        try:
            fb_res = await client.get(fallback_url, timeout=self.timeout)
            if fb_res.status_code == 200:
                fb_data = fb_res.json()
                if fb_data.get("success", False):
                    result["country"] = fb_data.get("country", "Unknown")
                    result["country_code"] = fb_data.get("country_code", "")
                    result["region"] = fb_data.get("region", "")
                    result["city"] = fb_data.get("city", "Unknown")
                    result["latitude"] = float(fb_data.get("latitude", 0.0))
                    result["longitude"] = float(fb_data.get("longitude", 0.0))
                    result["timezone"] = fb_data.get("timezone", "")
                    result["isp"] = fb_data.get("isp", "Unknown")
                    result["org"] = fb_data.get("org", "Unknown")
                    result["asn"] = fb_data.get("asn", "Unknown")
                    return result
        except Exception as e:
            result["status"] = "error"
            result["note"] = f"GeoIP resolution failed: {str(e)}"

        return result
