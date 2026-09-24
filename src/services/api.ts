/// <reference types="vite/client" />

/**
 * ThreatScope API client — resolves the backend target dynamically.
 *
 *  - In PRODUCTION (Vercel): set VITE_API_URL in the Vercel project env
 *    to the Docker backend URL (e.g. https://engine.example.com).
 *  - In LOCAL DEV: falls back to http://localhost:8000, and vite.config.ts
 *    proxies /api/* there so the browser hits same-origin.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${init?.method ? "" : ""}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

// --- Types (mirror backend models) ----------------------------------------

export type TargetType = "domain" | "email" | "ip";

export interface GraphNode {
  id: string;
  canonical_id: string;
  category: string;
  label: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  source_canonical_id: string;
  target_canonical_id: string;
  relationship: string;
  confidence: number;
}

export interface InvestigateResponse {
  risk_level: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  telemetry: Record<string, unknown>;
}

// --- Endpoints -----------------------------------------------------------

export function queryTarget(target: string, type: TargetType, smtpProbe = false) {
  return request<InvestigateResponse>("/api/v1/investigate", {
    method: "POST",
    body: JSON.stringify({ target, target_type: type, smtp_probe: smtpProbe }),
  });
}

export function pivotNode(nodeId: string, pivotType: string) {
  return request<InvestigateResponse>("/api/v1/pivot", {
    method: "POST",
    body: JSON.stringify({ node_id: nodeId, pivot_type: pivotType }),
  });
}

export function resolveTarget(target: string, type: TargetType, smtpProbe = false) {
  const params = new URLSearchParams({ smtp_probe: String(smtpProbe) });
  return request<Record<string, unknown>>(
    `/api/v1/resolve/${type}/${encodeURIComponent(target)}?${params}`
  );
}

export function geoipLookup(ip: string) {
  return request<Record<string, unknown>>(`/api/v1/geoip/${encodeURIComponent(ip)}`);
}

export function rangeQuery(prefix: string) {
  return request<{ prefix: string; bucket_size: number; body: string }>(
    `/api/v1/range/${prefix}`
  );
}

export function healthCheck() {
  return request<Record<string, unknown>>("/health");
}
