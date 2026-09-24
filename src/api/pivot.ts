/**
 * Pivot Investigation API — TypeScript helpers for entity pivoting.
 *
 * A "pivot" takes an entity already present on the graph (identified by its
 * `canonical_id`) and fires a *secondary* sidecar query through Tauri IPC,
 * treating that entity as the new investigation seed. The returned payload
 * is merged into the active graph in real time — no screen refresh required.
 */

import { runEngineInvestigation as runInvestigation, isInvestigationResult, isErrorResponse } from "./engine";
import type {
  GraphNode,
  InvestigationPayload,
  InvestigationRequest,
  InvestigationResult,
  SeedType,
} from "./types";

/** Maps graph node categories to sidecar seed types. */
const CATEGORY_TO_SEED_TYPE: Record<string, SeedType> = {
  email: "email",
  username: "username",
  domain: "domain",
  ip: "ip",
  url: "url",
  phone: "phone",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
const URL_REGEX = /^https?:\/\//i;

/**
 * Derives the sidecar seed type for a graph node so it can be re-queried.
 * Uses the node's declared category first, falling back to structural
 * inference from the label (email / IPv4 / domain / url / username).
 */
export function deriveSeedType(node: Pick<GraphNode, "category" | "label">): SeedType {
  const categorySeed = CATEGORY_TO_SEED_TYPE[String(node.category || "").toLowerCase()];
  if (categorySeed) return categorySeed;

  const label = String(node.label || "").trim();
  if (URL_REGEX.test(label) || label.includes("/")) return "url";
  if (EMAIL_REGEX.test(label)) return "email";
  if (IPV4_REGEX.test(label)) return "ip";
  if (DOMAIN_REGEX.test(label)) return "domain";
  return "username";
}

/**
 * Fires a secondary sidecar query through Tauri IPC for the given entity.
 *
 * Reuses the same `run_investigation` Rust command used for seed searches —
 * the Rust layer spawns the sidecar and streams back progress pulses plus a
 * final bundle. Resolves with the final `InvestigationResult`.
 */
export async function runPivotQuery(request: InvestigationRequest): Promise<InvestigationResult> {
  const iterator = runInvestigation(request);
  let finalResult: InvestigationResult | null = null;

  for await (const response of iterator) {
    if (isInvestigationResult(response)) {
      finalResult = response;
    } else if (isErrorResponse(response)) {
      throw new Error(response.message);
    }
  }

  if (!finalResult) {
    throw new Error("Pivot query completed without returning a result bundle.");
  }
  return finalResult;
}

/** Unique key identifying an edge (endpoints + relationship type). */
function edgeKey(edge: { source_canonical_id: string; target_canonical_id: string; relationship: string }): string {
  return `${edge.source_canonical_id}->${edge.target_canonical_id}:${edge.relationship}`;
}

/**
 * Merges a pivot query's payload into the currently displayed graph,
 * deduplicating against the active graph.
 *
 * - Nodes are deduped by `canonical_id`. Newly discovered nodes are
 *   flagged with `metadata.is_new_discovery` so the canvas can highlight them.
 * - Edges are deduped by source/target/relationship.
 *
 * Returns a NEW payload object (original state untouched) plus the number
 * of newly added entities. Assigning it to state triggers GraphCanvas's
 * incremental update effect — real-time expansion, no screen refresh.
 */
export function mergePivotGraphs(
  currentPayload: InvestigationPayload,
  pivotResult: InvestigationResult
): { payload: InvestigationPayload; addedCount: number } {
  const nodeById = new Map<string, GraphNode>(
    currentPayload.nodes.map((n) => [n.canonical_id, n])
  );

  // Expire stale "new discovery" highlights from previous pivots.
  nodeById.forEach((node) => {
    if (node.metadata?.is_new_discovery) {
      nodeById.set(node.canonical_id, {
        ...node,
        metadata: { ...node.metadata, is_new_discovery: false },
      });
    }
  });

  const edgeMap = new Map<string, InvestigationPayload["edges"][number]>(
    currentPayload.edges.map((e) => [edgeKey(e), e])
  );

  let addedCount = 0;
  for (const node of pivotResult.payload.nodes) {
    if (!nodeById.has(node.canonical_id)) {
      nodeById.set(node.canonical_id, {
        ...node,
        metadata: { ...node.metadata, is_new_discovery: true },
      });
      addedCount += 1;
    }
  }
  for (const edge of pivotResult.payload.edges) {
    edgeMap.set(edgeKey(edge), edge);
  }

  return {
    payload: {
      ...currentPayload,
      nodes: Array.from(nodeById.values()),
      edges: Array.from(edgeMap.values()),
    },
    addedCount,
  };
}