/**
 * ThreatScope TypeScript API types.
 *
 * These interfaces mirror the JSON structures emitted by the Python
 * sidecar binary (`threatscope-engine`). The Rust layer simply passes
 * the raw JSON string back to the frontend, which parses each line
 * individually.
 */

/** Stage progress pulse emitted before each processing stage. */
export interface ProgressUpdate {
  status: "progress";
  stage:
    | "fetching_osint"
    | "deduplicating_graph"
    | "assessing_risk"
    | "generating_narrative";
}

/** Final success bundle containing all results. */
export interface InvestigationResult {
  status: "success";
  payload: InvestigationPayload;
  risk: RiskAssessment;
  narrative: IntelligenceSummary;
}

/** Error response from the sidecar. */
export interface ErrorResponse {
  status: "error";
  message: string;
}

/** Union type for all possible sidecar responses. */
export type SidecarResponse = ProgressUpdate | InvestigationResult | ErrorResponse;

// --- Core schemas ---

export type SeedType = "email" | "url" | "domain" | "ip" | "username" | "phone";

export interface SeedInput {
  value: string;
  seed_type: SeedType;
  depth: number;
}

export type NodeCategory =
  | "identity"
  | "infrastructure"
  | "breach"
  | "telephony"
  | "social"
  | "external"
  | "domain"
  | "ip"
  | "email"
  | "geo"
  | "username"
  | "url";

export interface GraphNode {
  id: string;
  canonical_id: string;
  category: NodeCategory;
  label: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  source_canonical_id: string;
  target_canonical_id: string;
  relationship: string;
}

export interface InvestigationPayload {
  id: string;
  seed: SeedInput;
  created_at: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  risk_score: number;
  metadata: Record<string, unknown>;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  confidence_delta: number;
  triggered_rules: string[];
  velocity_badge: string;
  raw_findings: Record<string, unknown>;
}

export interface IntelligenceSummary {
  executive_summary: string;
  key_findings: string[];
  pivot_opportunities: string[];
  remediation_steps: string[];
  target_opsec_awareness: "HIGH" | "MEDIUM" | "LOW";
}

/** Request body for the investigate command. */
export interface InvestigationRequest {
  value: string;
  type: SeedType;
}
