"""Global Phone Number Intelligence Fetcher.

Powered by Google's libphonenumber engine (phonenumbers).
Parses international numbers (E.164), extracts telecom carrier,
geographic country/region, line type (Mobile, Landline, VoIP/Burner),
timezones, and geographic coordinates for threat mapping.
"""

from typing import Any, Dict, Optional, Tuple
import httpx

try:
    import phonenumbers
    from phonenumbers import geocoder, carrier, timezone, PhoneNumberType, PhoneNumberFormat
    PHONENUMBERS_AVAILABLE = True
except ImportError:
    PHONENUMBERS_AVAILABLE = False

from core.fetchers.base import BaseFetcher
from core.schemas import SeedInput, SeedType


# Approximate centroid coordinates for international country dial codes
COUNTRY_COORDINATES: Dict[int, Tuple[float, float, str]] = {
    1:   (37.0902, -95.7129, "US"),    # USA / Canada
    44:  (55.3781, -3.4360, "GB"),     # United Kingdom
    234: (9.0820, 8.6753, "NG"),       # Nigeria
    27:  (-30.5595, 22.9375, "ZA"),    # South Africa
    254: (-0.0236, 37.9062, "KE"),     # Kenya
    233: (7.9465, -1.0232, "GH"),      # Ghana
    20:  (26.8206, 30.8025, "EG"),      # Egypt
    33:  (46.2276, 2.2137, "FR"),      # France
    49:  (51.1657, 10.4515, "DE"),     # Germany
    39:  (41.8719, 12.5674, "IT"),     # Italy
    34:  (40.4637, -3.7492, "ES"),     # Spain
    31:  (52.1326, 5.2913, "NL"),      # Netherlands
    41:  (46.8182, 8.2275, "CH"),      # Switzerland
    46:  (60.1282, 18.6435, "SE"),     # Sweden
    47:  (60.4720, 8.4689, "NO"),      # Norway
    61:  (-25.2744, 133.7751, "AU"),   # Australia
    64:  (-40.9006, 174.8860, "NZ"),   # New Zealand
    91:  (20.5937, 78.9629, "IN"),     # India
    86:  (35.8617, 104.1954, "CN"),    # China
    81:  (36.2048, 138.2529, "JP"),    # Japan
    82:  (35.9078, 127.7669, "KR"),    # South Korea
    65:  (1.3521, 103.8198, "SG"),     # Singapore
    971: (23.4241, 53.8478, "AE"),     # UAE
    966: (23.8859, 45.0792, "SA"),     # Saudi Arabia
    55:  (-14.2350, -51.9253, "BR"),   # Brazil
    52:  (23.6345, -102.5528, "MX"),   # Mexico
    54:  (-38.4161, -63.6167, "AR"),   # Argentina
    7:   (61.5240, 105.3188, "RU"),    # Russia
    380: (48.3794, 31.1656, "UA"),     # Ukraine
    48:  (51.9194, 19.1451, "PL"),     # Poland
    90:  (38.9637, 35.2433, "TR"),     # Turkey
    62:  (-0.7893, 113.9213, "ID"),    # Indonesia
    60:  (4.2105, 101.9758, "MY"),     # Malaysia
    63:  (12.8797, 121.7740, "PH"),    # Philippines
    92:  (30.3753, 69.3451, "PK"),     # Pakistan
    880: (23.6850, 90.3563, "BD"),     # Bangladesh
    351: (39.3999, -8.2245, "PT"),     # Portugal
    353: (53.1424, -7.6921, "IE"),     # Ireland
    32:  (50.5039, 4.4699, "BE"),      # Belgium
    43:  (47.5162, 14.5501, "AT"),     # Austria
}

TYPE_MAP = {
    PhoneNumberType.MOBILE: "Mobile Cellular",
    PhoneNumberType.FIXED_LINE: "Fixed Line (Landline)",
    PhoneNumberType.FIXED_LINE_OR_MOBILE: "Fixed Line or Mobile",
    PhoneNumberType.VOIP: "VoIP / Virtual Carrier (Burner Risk)",
    PhoneNumberType.TOLL_FREE: "Toll Free",
    PhoneNumberType.PREMIUM_RATE: "Premium Rate",
    PhoneNumberType.SHARED_COST: "Shared Cost",
    PhoneNumberType.VOICEMAIL: "Voicemail Access",
    PhoneNumberType.PAGER: "Pager",
    PhoneNumberType.PERSONAL_NUMBER: "Personal Number",
    PhoneNumberType.UAN: "Universal Access Number (UAN)",
    PhoneNumberType.UNKNOWN: "Standard Telecom",
}


class PhoneFetcher(BaseFetcher):
    """Global Telecom & Phone Number Threat Intelligence Fetcher."""

    def __init__(self, timeout: float = 3.0):
        super().__init__(name="Global Telecom & Phone Intelligence Fetcher", timeout=timeout)

    async def fetch(self, seed: SeedInput, client: httpx.AsyncClient) -> Dict[str, Any]:
        if seed.seed_type != SeedType.PHONE:
            return {"status": "skipped", "reason": "PhoneFetcher requires SeedType.PHONE"}

        raw = seed.value.strip()
        if not PHONENUMBERS_AVAILABLE:
            return {
                "status": "partial",
                "phone": raw,
                "reason": "phonenumbers engine not installed",
            }

        return self.analyze_phone(raw)

    def analyze_phone(self, raw_input: str) -> Dict[str, Any]:
        cleaned = "".join(c for c in raw_input if c.isdigit() or c == "+")
        parsed_num = None

        # Attempt 1: direct parse (if user included + or international format)
        try:
            parsed_num = phonenumbers.parse(cleaned, None)
        except Exception:
            pass

        # Attempt 2: prepend + if missing
        if parsed_num is None and not cleaned.startswith("+"):
            try:
                parsed_num = phonenumbers.parse("+" + cleaned, None)
            except Exception:
                pass

        if parsed_num is None:
            return {
                "status": "failed",
                "phone": raw_input,
                "reason": "Unable to parse phone number into an international E.164 representation",
            }

        is_valid = phonenumbers.is_valid_number(parsed_num)
        is_possible = phonenumbers.is_possible_number(parsed_num)
        num_type_enum = phonenumbers.number_type(parsed_num)
        line_type_str = TYPE_MAP.get(num_type_enum, "Standard Telecom")
        is_voip = (num_type_enum == PhoneNumberType.VOIP)

        # Country & Geographic metadata
        country_code = parsed_num.country_code
        country_name = geocoder.country_name_for_number(parsed_num, "en") or "Unknown"
        location_desc = geocoder.description_for_number(parsed_num, "en") or country_name
        carrier_name = carrier.name_for_number(parsed_num, "en") or "Unknown Carrier / Unlisted"
        tz_list = list(timezone.time_zones_for_number(parsed_num))

        # Formatted variants
        e164 = phonenumbers.format_number(parsed_num, PhoneNumberFormat.E164)
        international = phonenumbers.format_number(parsed_num, PhoneNumberFormat.INTERNATIONAL)
        national = phonenumbers.format_number(parsed_num, PhoneNumberFormat.NATIONAL)

        # Coordinate resolution for ThreatMap
        coords = COUNTRY_COORDINATES.get(country_code)
        latitude = coords[0] if coords else None
        longitude = coords[1] if coords else None
        country_iso = coords[2] if coords else ""

        return {
            "status": "success",
            "phone_raw": raw_input,
            "e164": e164,
            "international": international,
            "national": national,
            "country_code": country_code,
            "country_name": country_name,
            "country_iso": country_iso,
            "location": location_desc,
            "carrier": carrier_name,
            "line_type": line_type_str,
            "is_voip": is_voip,
            "is_valid": is_valid,
            "is_possible": is_possible,
            "timezones": tz_list,
            "latitude": latitude,
            "longitude": longitude,
        }
