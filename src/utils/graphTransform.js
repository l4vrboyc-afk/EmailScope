/**
 * Graph Data Model Transformer — ThreatScope topology canvas.
 *
 * Converts raw OSINT entity objects (from the sidecar / pivot engine) into
 * clean renderable graph nodes. Heavy telemetry (raw narrative paragraphs,
 * k-anonymity breach records, rule dumps) is stored in the node's `data`
 * payload for the contextual Node Detail Drawer — NEVER rendered as canvas
 * text. Canvas labels stay minimal: a primary identifier + short status
 * badge, preventing text-overflow collisions on the topology map.
 */

/** Max characters of the primary identifier shown on the canvas node. */
export const MAX_CANVAS_LABEL_LENGTH = 28;

/**
 * Truncate a primary identifier for canvas rendering with an ellipsis.
 */
export function truncateIdentifier(label, max = MAX_CANVAS_LABEL_LENGTH) {
  if (typeof label !== 'string') return String(label ?? '');
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

/**
 * Derive a short risk level for the node's status badge.
 * Priority: explicit k-anonymity threat tier → breach count heuristics →
 * infrastructure posture → pivot-degree → neutral 'INFO'.
 */
export function deriveRiskLevel(entity) {
  const m = entity?.metadata || {};

  // 1. K-anonymity breach telemetry (from the Python kanonymity module).
  const ka = m.k_anonymity || m.breach_telemetry || m.breachTelemetry;
  if (ka && typeof ka === 'object') {
    if (ka.threat_level && ka.threat_level !== 'UNVERIFIED') return ka.threat_level;
    if (typeof ka.pwned_count === 'number') {
      if (ka.pwned_count >= 50) return 'CRITICAL';
      if (ka.pwned_count >= 10) return 'HIGH';
      if (ka.pwned_count >= 1) return 'MEDIUM';
      return 'CLEAN';
    }
  }

  // 2. Breach-category nodes carrying an explicit count.
  if (typeof m.breach_count === 'number') {
    if (m.breach_count >= 50) return 'CRITICAL';
    if (m.breach_count >= 10) return 'HIGH';
    if (m.breach_count >= 1) return 'MEDIUM';
    return 'CLEAN';
  }

  // 3. Misconfigured infrastructure (mail security posture).
  if (m.has_spf === false || m.has_dmarc === false) return 'MEDIUM';

  // 4. Structural pivot nodes are noteworthy but not "risky".
  if (m.is_key_pivot_node) return 'INFO';

  return 'INFO';
}

/**
 * Normalize any k-anonymity telemetry variant into the drawer's expected
 * shape ({ compromised, pwned_count, threat_level, k_anonymity_bucket_size,
 * cache_hit, status }). Returns null when the entity carries no telemetry.
 */
export function extractKAnonymityStatus(entity) {
  const m = entity?.metadata || {};
  const ka = m.k_anonymity || m.breach_telemetry || m.breachTelemetry;
  if (ka && typeof ka === 'object') {
    return {
      status: ka.status || 'verified',
      compromised: !!ka.compromised,
      pwned_count: ka.pwned_count ?? ka.breach_count ?? 0,
      threat_level: ka.threat_level || 'UNVERIFIED',
      k_anonymity_bucket_size: ka.k_anonymity_bucket_size ?? 0,
      cache_hit: !!ka.cache_hit,
      reason: ka.reason ?? null,
    };
  }
  if (typeof m.breach_count === 'number') {
    return {
      status: 'verified',
      compromised: m.breach_count > 0,
      pwned_count: m.breach_count,
      threat_level: deriveRiskLevel(entity),
      k_anonymity_bucket_size: 0,
      cache_hit: false,
      reason: null,
    };
  }
  return null;
}

/**
 * Pull a human-readable raw OSINT paragraph off the entity, if present.
 */
export function extractRawOSINTText(entity) {
  const m = entity?.metadata || {};
  const candidate =
    m.raw_text_description ??
    m.rawOSINTText ??
    m.raw_osint_text ??
    m.description ??
    m.summary ??
    m.narrative ??
    null;
  if (typeof candidate === 'string' && candidate.trim()) return candidate;
  if (candidate && typeof candidate === 'object') {
    try { return JSON.stringify(candidate, null, 2); } catch { /* noop */ }
  }
  return null;
}

/**
 * Extract triggered risk-engine rule names for the drawer's telemetry tab.
 */
export function extractTriggeredRules(entity) {
  const m = entity?.metadata || {};
  const rules = m.triggered_rules ?? m.triggeredRules ?? m.risk_rules ?? null;
  if (Array.isArray(rules)) return rules;
  if (rules && typeof rules === 'object') return Object.keys(rules);
  return null;
}

/**
 * Transform a raw OSINT entity object into the clean graph node model.
 *
 *   const formattedNode = {
 *     id: entity.id,
 *     label: entity.primary_identifier,   // "github.com", "user@x.com"
 *     badge: "EMAIL • HIGH",
 *     data: {
 *       rawOSINTText: entity.raw_text_description,
 *       kAnonymityStatus: entity.breach_telemetry,
 *       metadata: entity.extracted_metadata,
 *       triggeredRules: entity.triggered_rules,
 *     },
 *   };
 */
export function formatGraphNode(entity) {
  const metadata = entity?.metadata || {};
  const category = entity?.category || 'identity';

  // Primary identifier: explicit field → label → canonical id tail.
  const primaryIdentifier =
    entity?.primary_identifier ??
    entity?.label ??
    entity?.canonical_id?.split(':').slice(1).join(':') ??
    entity?.id ??
    '';

  return {
    id: entity?.canonical_id || entity?.id,
    // Minimal canvas identifier — long OSINT text NEVER lands here.
    label: truncateIdentifier(primaryIdentifier),
    // Short status badge, e.g. "EMAIL • HIGH".
    badge: `${String(category).toUpperCase()} • ${deriveRiskLevel(entity)}`,
    riskLevel: deriveRiskLevel(entity),
    // Heavy telemetry lives here — rendered only in the detail drawer.
    data: {
      rawOSINTText: extractRawOSINTText(entity),
      kAnonymityStatus: extractKAnonymityStatus(entity),
      metadata,
      triggeredRules: extractTriggeredRules(entity),
    },
  };
}

