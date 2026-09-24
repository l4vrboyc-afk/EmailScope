"""ThreatScope Native Network & Protocol Resolvers — $0-Cost Independent Layer.

Zero external API keys. Everything here speaks raw protocols directly:

* **DNS / mail-security policy** — ``dns.asyncresolver`` pinned to public
  resolvers (1.1.1.1 / 8.8.8.8).  Queries A, AAAA, MX, NS and TXT records,
  extracts SPF (``v=spf1``) and DMARC (``v=DMARC1``) policies with local
  regex evaluation, and flags high-risk domain configurations (missing
  SPF/DMARC, soft-only enforcement).
* **RDAP / WHOIS registration telemetry** — open bootstrap gateway
  ``https://rdap.org/{domain|ip}/{entity}``.  Parses registrar, creation /
  expiration events and nameservers.  No key, no vendor SDK.
* **SMTP gateway inspection** — raw ``asyncio`` TCP socket to port 25:
  reads the server greeting banner, issues ``EHLO threatscope.local``,
  captures advertised extensions (STARTTLS, VRFY, SIZE, ...) and closes
  gracefully with ``QUIT``.

Public surface
--------------
- :func:`resolve_domain_security`  — full DNS + SPF/DMARC posture payload
- :func:`fetch_rdap_telemetry`     — registration / WHOIS telemetry
- :func:`inspect_smtp_gateway`     — MX banner + capability probe
- :func:`resolve_all`              — parallel gather of the above

All functions are async and return plain JSON-serializable dicts with an
explicit ``status`` field so callers can degrade gracefully per resolver.
"""

import asyncio
import re
from typing import Any, Dict, List, Optional

import dns.asyncresolver
import dns.exception
import dns.resolver
import httpx

__all__ = [
    "PUBLIC_RESOLVERS",
    "parse_spf_record",
    "parse_dmarc_record",
    "parse_ehlo_extensions",
    "resolve_domain_security",
    "fetch_rdap_telemetry",
    "inspect_smtp_gateway",
    "resolve_all",
]

# Public anycast resolvers used for all queries (no system DNS dependence).
PUBLIC_RESOLVERS = ["1.1.1.1", "8.8.8.8"]

RDAP_BASE_URL = "https://rdap.org"

EHLO_TIMEOUT = 8.0


def _make_resolver(timeout: float = 4.0) -> dns.asyncresolver.Resolver:
    """Build an async resolver pinned to the public anycast resolvers."""
    resolver = dns.asyncresolver.Resolver(configure=False)
    resolver.nameservers = list(PUBLIC_RESOLVERS)
    resolver.lifetime = timeout
    resolver.timeout = timeout
    return resolver

# --------------------------------------------------------------------------- #
# SPF / DMARC policy parsing (pure functions — unit-testable offline)
# --------------------------------------------------------------------------- #
_SPF_ALL_RE = re.compile(r"(?P<qualifier>[-~+?])all\b")
_SPF_REDIRECT_RE = re.compile(r"redirect=(?P<domain>[^\s]+)", re.IGNORECASE)
_DMARC_POLICY_RE = re.compile(r"\bp=(?P<policy>none|quarantine|reject)\b", re.IGNORECASE)
_DMARC_PCT_RE = re.compile(r"\bpct=(?P<pct>\d{1,3})\b", re.IGNORECASE)
_DMARC_RUA_RE = re.compile(r"\brua=(?P<rua>[^\s;]+)", re.IGNORECASE)


def parse_spf_record(record: str) -> Dict[str, Any]:
    """Evaluate an SPF record string (``v=spf1 ...``) into policy flags.

    Returns the ``all`` mechanism qualifier (``-all`` hard fail, ``~all``
    soft fail, ``?all`` neutral, ``+all`` allow-any — the worst possible
    posture), any ``redirect=`` target, and the raw mechanism list.
    """
    mechanisms: List[str] = []
    for token in (record or "").split():
        if token.lower() != "v=spf1":
            mechanisms.append(token)

    match = _SPF_ALL_RE.search(record or "")
    all_qualifier = match.group("qualifier") if match else None
    redirect_match = _SPF_REDIRECT_RE.search(record or "")
    redirect = redirect_match.group("domain").rstrip(".").lower() if redirect_match else None

    if all_qualifier == "-":
        enforcement = "enforced"
    elif all_qualifier == "~":
        enforcement = "softfail"
    elif all_qualifier == "?":
        enforcement = "neutral"
    elif all_qualifier == "+":
        enforcement = "allow_any"
    elif redirect:
        enforcement = "redirected"
    else:
        enforcement = "undefined"

    return {
        "version": "spf1",
        "mechanisms": mechanisms,
        "all_qualifier": all_qualifier,
        "all_enforcement": enforcement,
        "redirect": redirect,
        "enforced": enforcement in ("enforced", "redirected"),
    }


def parse_dmarc_record(record: str) -> Dict[str, Any]:
    """Evaluate a DMARC record string (``v=DMARC1; ...``) into policy flags."""
    policy_match = _DMARC_POLICY_RE.search(record or "")
    pct_match = _DMARC_PCT_RE.search(record or "")
    rua_match = _DMARC_RUA_RE.search(record or "")

    policy = policy_match.group("policy").lower() if policy_match else None
    pct = None
    if pct_match:
        try:
            pct = max(0, min(100, int(pct_match.group("pct"))))
        except ValueError:
            pct = None

    return {
        "version": "DMARC1",
        "policy": policy,
        "enforced": policy == "reject",
        "partial": policy == "quarantine"
        or (policy == "reject" and pct is not None and pct < 100),
        "monitor_only": policy == "none",
        "pct": pct,
        "rua": rua_match.group("rua") if rua_match else None,
    }


def parse_ehlo_extensions(ehlo_response: str) -> List[str]:
    """Extract advertised SMTP capability keywords from an EHLO response."""
    extensions: List[str] = []
    for raw_line in (ehlo_response or "").splitlines():
        token = raw_line.strip()
        if not token:
            continue
        # Strip "250-" / "250 " status prefixes if present.
        if re.match(r"^\d{3}[- ]", token):
            token = token[4:].strip()
        if not token:
            continue
        keyword = re.split(r"[\s=]", token, 1)[0].strip().upper()
        if keyword and not keyword.isdigit() and keyword not in extensions:
            extensions.append(keyword)
    return extensions


# --------------------------------------------------------------------------- #
# 1. Async DNS & mail-security policy resolver
# --------------------------------------------------------------------------- #
async def _txt_lookup(resolver, name: str) -> List[str]:
    """Return decoded TXT strings for *name* (empty list on any failure)."""
    try:
        answers = await resolver.resolve(name, "TXT")
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout, Exception):
        return []
    strings: List[str] = []
    for rdata in answers:
        try:
            strings.append("".join(b.decode("utf-8", errors="ignore") for b in rdata.strings))
        except Exception:
            continue
    return strings


async def resolve_domain_security(domain: str, timeout: float = 4.0) -> Dict[str, Any]:
    """Resolve a domain's full mail-security posture via native DNS.

    Queries MX (exchange hosts + priority), A / AAAA, NS and TXT records
    through public resolvers, then locally evaluates SPF and DMARC policy
    strings.  Flags high-risk configurations (missing SPF/DMARC, monitor-
    only DMARC, soft-only SPF).
    """
    domain = (domain or "").strip().rstrip(".").lower()
    result: Dict[str, Any] = {
        "status": "success",
        "resolver": "native-dnspython",
        "nameservers": list(PUBLIC_RESOLVERS),
        "domain": domain,
        "a_records": [],
        "aaaa_records": [],
        "mx_records": [],          # exchange hostnames
        "mx_details": [],          # [{host, priority}]
        "ns_records": [],
        "has_spf": False,
        "spf_record": None,
        "spf_policy": None,
        "has_dmarc": False,
        "dmarc_record": None,
        "dmarc_policy": None,
        "risk_flags": [],
    }
    if not domain:
        result["status"] = "failed"
        result["reason"] = "Empty domain"
        return result

    resolver = _make_resolver(timeout)

    # -- MX records ---------------------------------------------------------
    try:
        mx_answers = await resolver.resolve(domain, "MX")
        for r in sorted(mx_answers, key=lambda x: x.preference):
            exchange = str(r.exchange).rstrip(".").lower()
            result["mx_records"].append(exchange)
            result["mx_details"].append({"host": exchange, "priority": int(r.preference)})
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout, Exception):
        pass

    # -- A / AAAA -----------------------------------------------------------
    for rrtype, key in (("A", "a_records"), ("AAAA", "aaaa_records")):
        try:
            answers = await resolver.resolve(domain, rrtype)
            result[key] = [str(r) for r in answers]
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout, Exception):
            pass

    # -- NS -----------------------------------------------------------------
    try:
        ns_answers = await resolver.resolve(domain, "NS")
        result["ns_records"] = [str(r).rstrip(".").lower() for r in ns_answers]
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout, Exception):
        pass

    # -- TXT: SPF -----------------------------------------------------------
    for txt in await _txt_lookup(resolver, domain):
        if txt.lower().startswith("v=spf1"):
            result["has_spf"] = True
            result["spf_record"] = txt
            result["spf_policy"] = parse_spf_record(txt)
            break

    # -- TXT: DMARC ---------------------------------------------------------
    for txt in await _txt_lookup(resolver, f"_dmarc.{domain}"):
        if txt.lower().startswith("v=dmarc1"):
            result["has_dmarc"] = True
            result["dmarc_record"] = txt
            result["dmarc_policy"] = parse_dmarc_record(txt)
            break

    # -- Risk flagging ------------------------------------------------------
    flags: List[str] = []
    if not result["mx_records"]:
        flags.append("NO_MX")
    if not result["has_spf"]:
        flags.append("MISSING_SPF")
    if not result["has_dmarc"]:
        flags.append("MISSING_DMARC")
    spf = result.get("spf_policy") or {}
    dmarc = result.get("dmarc_policy") or {}
    if spf.get("all_enforcement") == "allow_any":
        flags.append("SPF_ALLOW_ANY")
    if spf.get("all_enforcement") == "softfail":
        flags.append("SPF_SOFTFAIL_ONLY")
    if dmarc.get("monitor_only"):
        flags.append("DMARC_MONITOR_ONLY")
    result["risk_flags"] = flags
    return result


# --------------------------------------------------------------------------- #
# 2. Native RDAP / WHOIS client (open bootstrap gateway — zero cost)
# --------------------------------------------------------------------------- #
_RDAP_EVENT_MAP = {
    "registration": "creation_date",
    "expiration": "expiration_date",
    "last changed": "last_changed_date",
    "last update of RDAP database": "rdap_updated",
}


def parse_rdap_payload(entity: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a raw RDAP JSON response into flat telemetry fields."""
    events = {}
    for event in data.get("events") or []:
        action = str(event.get("eventAction", "")).lower()
        field = _RDAP_EVENT_MAP.get(action)
        if field and event.get("eventDate"):
            events[field] = event["eventDate"]

    registrar = None
    for entity_ref in data.get("entities") or []:
        if "registrar" in (entity_ref.get("roles") or []):
            vcard = entity_ref.get("vcardArray")
            if vcard and len(vcard) > 1:
                for item in vcard[1]:
                    if item and item[0] == "fn" and len(item) > 3:
                        registrar = item[3]
                        break
            if not registrar:
                registrar = entity_ref.get("handle")
            break

    nameservers = [
        str(ns.get("ldhName", "")).rstrip(".").lower()
        for ns in (data.get("nameservers") or [])
        if ns.get("ldhName")
    ]

    return {
        "entity": entity,
        "registrar": registrar,
        "creation_date": events.get("creation_date"),
        "expiration_date": events.get("expiration_date"),
        "last_changed_date": events.get("last_changed_date"),
        "nameservers": nameservers,
        "domain_status": data.get("status") or [],  # NOTE: do not collide w/ top-level "status" sentinel
        "handle": data.get("handle"),
    }

async def fetch_rdap_telemetry(
    entity: str,
    client: Optional[httpx.AsyncClient] = None,
    timeout: float = 8.0,
) -> Dict[str, Any]:
    """Query the open RDAP bootstrap gateway for registration telemetry.

    Automatically routes domains through ``/domain/{entity}`` and IP
    addresses through ``/ip/{entity}``.  No API key required.
    """
    entity = (entity or "").strip().rstrip(".").lower()
    is_ip = bool(re.match(r"^(\d{1,3}\.){3}\d{1,3}$", entity) or ":" in entity)
    path = "ip" if is_ip else "domain"
    url = f"{RDAP_BASE_URL}/{path}/{entity}"

    owns_client = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=timeout, follow_redirects=True)
    try:
        response = await client.get(
            url, headers={"user-agent": "ThreatScope-OSINT", "accept": "application/rdap+json"}
        )
        if response.status_code == 404:
            return {"status": "success", "found": False, "reason": "Not registered in RDAP", **{"entity": entity}}
        if response.status_code == 429:
            return {"status": "failed", "reason": "Rate limited by RDAP gateway", "entity": entity}
        if response.status_code != 200:
            return {
                "status": "failed",
                "reason": f"Unexpected RDAP status {response.status_code}",
                "entity": entity,
            }
        payload = response.json()
        return {"status": "success", "found": True, **parse_rdap_payload(entity, payload)}
    except httpx.RequestError as exc:
        return {"status": "failed", "reason": f"RDAP transport error: {exc}", "entity": entity}
    finally:
        if owns_client:
            await client.aclose()


# --------------------------------------------------------------------------- #
# 3. SMTP socket banner inspector (raw asyncio TCP, port 25)
# --------------------------------------------------------------------------- #
async def inspect_smtp_gateway(
    mx_host: str,
    port: int = 25,
    timeout: float = EHLO_TIMEOUT,
    ehlo_domain: str = "threatscope.local",
) -> Dict[str, Any]:
    """Connect to *mx_host:25*, read the greeting banner and probe EHLO.

    Issues ``EHLO {ehlo_domain}``, captures the advertised extension list
    (STARTTLS, VRFY, SIZE, ...), then closes gracefully with ``QUIT``.
    Never raises — failures surface as ``status="failed"`` payloads so bulk
    graph expansions can keep moving.
    """
    result: Dict[str, Any] = {
        "status": "failed",
        "host": mx_host,
        "port": port,
        "banner": None,
        "ehlo_extensions": [],
        "supports_starttls": False,
        "supports_vrfy": False,
        "open_relay_probe": False,
    }
    if not mx_host:
        result["reason"] = "Empty MX host"
        return result

    reader: Optional[asyncio.StreamReader] = None
    writer: Optional[asyncio.StreamWriter] = None
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(mx_host, port), timeout=timeout
        )
        result["status"] = "success"

        # 1. Greeting banner (e.g. "220 mail.example.com ESMTP Postfix")
        greeting = await asyncio.wait_for(reader.readline(), timeout=timeout)
        result["banner"] = greeting.decode("utf-8", errors="replace").strip()

        # 2. EHLO handshake — capture capability extensions.
        writer.write(f"EHLO {ehlo_domain}\r\n".encode("ascii"))
        await writer.drain()
        ehlo_lines: List[str] = []
        while True:
            line = await asyncio.wait_for(reader.readline(), timeout=timeout)
            text = line.decode("utf-8", errors="replace").rstrip("\r\n")
            ehlo_lines.append(text)
            if len(text) < 4 or text[3] != "-":  # "250-" continues, "250 " ends
                break
        result["raw_ehlo"] = ehlo_lines
        extensions = parse_ehlo_extensions("\n".join(ehlo_lines))
        result["ehlo_extensions"] = extensions
        result["supports_starttls"] = "STARTTLS" in extensions
        result["supports_vrfy"] = "VRFY" in extensions
    except (asyncio.TimeoutError, TimeoutError):
        result["reason"] = f"Connection timed out after {timeout}s"
    except (ConnectionRefusedError, OSError) as exc:
        result["reason"] = f"Socket error: {exc}"
    except Exception as exc:  # defensive — never break a bulk sweep
        result["reason"] = f"Unexpected SMTP probe error: {exc}"
    finally:
        if writer is not None:
            try:
                writer.write(b"QUIT\r\n")
                await writer.drain()
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass
    return result



# --------------------------------------------------------------------------- #
# 4. Unified parallel resolver facade
# --------------------------------------------------------------------------- #
def _load_geoip_resolver():
    """Lazily import the Phase-3 GeoIP resolver (None when unavailable)."""
    try:
        from core.local_engine import resolve_ip_location

        return resolve_ip_location
    except Exception:
        return None


async def resolve_all(
    target: str,
    target_type: str = "domain",
    smtp_probe: bool = False,
) -> Dict[str, Any]:
    """Run every native resolver concurrently and return a unified payload.

    Parameters
    ----------
    target:
        Domain, email address or IP literal.
    target_type:
        ``"domain"`` | ``"email"`` | ``"ip"`` (emails are split to their
        domain for DNS/RDAP purposes).
    smtp_probe:
        When True, additionally probes the top MX host on port 25.

    Returns a JSON-serializable dict — zero API keys, zero paid services.
    """
    target = (target or "").strip()
    email_domain = target.split("@")[-1] if "@" in target else target
    geoip = _load_geoip_resolver()

    results: Dict[str, Any] = {"target": target, "target_type": target_type}

    if target_type == "ip":
        rdap_payload = await fetch_rdap_telemetry(target)
        geo_payload = None
        if geoip is not None:
            try:
                geo_payload = await asyncio.to_thread(geoip, target)
            except Exception as exc:
                geo_payload = {"status": "failed", "reason": str(exc)}
        results.update(
            {
                "dns": {"status": "skipped", "reason": "IP literal needs no DNS"},
                "rdap": rdap_payload,
                "geoip": geo_payload,
            }
        )
        return results

    if smtp_probe:
        dns_payload = await resolve_domain_security(email_domain)
        mx_hosts = dns_payload.get("mx_records") or []
        smtp_payload = (
            await inspect_smtp_gateway(mx_hosts[0])
            if mx_hosts
            else {"status": "failed", "reason": "No MX host to probe"}
        )
        rdap_payload = await fetch_rdap_telemetry(email_domain)
        results.update({"dns": dns_payload, "rdap": rdap_payload, "smtp": smtp_payload})
        return results

    dns_payload, rdap_payload = await asyncio.gather(
        resolve_domain_security(email_domain),
        fetch_rdap_telemetry(email_domain),
    )
    results.update({"dns": dns_payload, "rdap": rdap_payload})
    return results
