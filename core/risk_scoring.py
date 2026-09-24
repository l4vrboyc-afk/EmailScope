"""Data Class Risk Severity Index.

Maps the types of data exposed in a breach to a severity score so breach
nodes can be color-coded (yellow → dark red) by the frontend, and so analysts
see at a glance how dangerous an exposure is — not just the breach name.

Severity weights:
    CRITICAL (weight 10)  -> plaintext passwords, password hashes, SSN,
                             banking / financial info
    HIGH     (weight 7)   -> phone numbers, physical addresses
    MEDIUM   (weight 4)   -> IP addresses, usernames
    LOW      (weight 1)   -> anything else (e.g. email addresses, names)
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Tuple

# ---------------------------------------------------------------------------
# Severity classification
# ---------------------------------------------------------------------------

CRITICAL_DATA_CLASSES: Tuple[str, ...] = (
    "passwords",
    "password hashes",
    "passwords (hash)",  # defensive alias
    "password hint",
    "social security numbers",
    "social security number",
    "ssn",
    "bank account numbers",
    "credit cards",
    "financial investments",
    "financial transactions",
    "crypto wallets",
    "banking",
    "credit card cvv",
)

HIGH_DATA_CLASSES: Tuple[str, ...] = (
    "phone numbers",
    "phone number",
    "physical addresses",
    "physical address",
    "home addresses",
    "home address",
)

MEDIUM_DATA_CLASSES: Tuple[str, ...] = (
    "ip addresses",
    "ip address",
    "usernames",
    "username",
    "user agent strings",
)

# Track highest severity seen (for coloring).
CRITICAL = "critical"
HIGH = "high"
MEDIUM = "medium"
LOW = "low"
UNKNOWN = "none"

_SEVERITY_WEIGHT = {
    CRITICAL: 10,
    HIGH: 7,
    MEDIUM: 4,
    LOW: 1,
    UNKNOWN: 0,
}


def _classify_single(data_class: str) -> str:
    """Classify a single data class string into a severity bucket."""
    dc = (data_class or "").strip().lower()

    if dc in CRITICAL_DATA_CLASSES or any(dc == token for token in CRITICAL_DATA_CLASSES):
        return CRITICAL
    if dc in HIGH_DATA_CLASSES or any(dc == token for token in HIGH_DATA_CLASSES):
        return HIGH
    if dc in MEDIUM_DATA_CLASSES or any(dc == token for token in MEDIUM_DATA_CLASSES):
        return MEDIUM
    if dc:
        return LOW
    return UNKNOWN


def classify_data_classes(data_classes: Iterable[str]) -> List[Dict[str, Any]]:
    """Return a per-data-class severity breakdown.

    Each entry: {"data_class": str, "severity": str, "weight": int}
    """
    breakdown: List[Dict[str, Any]] = []
    for dc in data_classes:
        sev = _classify_single(dc)
        breakdown.append(
            {
                "data_class": dc,
                "severity": sev,
                "weight": _SEVERITY_WEIGHT[sev],
            }
        )
    return breakdown


def breach_risk_index(data_classes: Iterable[str]) -> Dict[str, Any]:
    """Compute a Breach Risk Severity Index for a single breach.

    Returns a dict suitable for attaching straight onto breach metadata:
        {
            "score": int,              # weighted risk score (higher = worse)
            "max_severity": str,       # highest severity bucket present
            "weighted_total": int,     # sum of all present-class weights
            "detail": [...],           # per-data-class classification
            "color_severity": str,     # canonical bucket for frontend color
        }
    """
    detail = classify_data_classes(data_classes)
    weighted_total = sum(item["weight"] for item in detail)

    buckets = [item["severity"] for item in detail]
    # Pick the loudest bucket for color-coding, fall back to 'none'.
    max_severity = UNKNOWN
    for candidate in (CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN):
        if candidate in buckets:
            max_severity = candidate
            break

    return {
        "score": weighted_total,
        "max_severity": max_severity,
        "weighted_total": weighted_total,
        "detail": detail,
        "color_severity": max_severity,
    }


# Convenience severity weight accessor (used by the orchestrator).
def severity_weight(severity: str) -> int:
    """Return the numeric weight for a severity bucket (0 for unknown)."""
    return _SEVERITY_WEIGHT.get(severity, 0)