import type { InvestigationPayload } from './types';

export function mergeWebResults(
  basePayload: InvestigationPayload,
  seedNodeId: string,
  results: WebResult[],
): InvestigationPayload {
  const newNodes = results.map((r) => ({
    id: `web_${crypto.randomUUID()}`,
    canonical_id: `web_${crypto.randomUUID()}`,
    category: 'external' as const,
    label: r.name,
    metadata: { url: r.url, snippet: r.snippet },
  }));

  const newEdges = newNodes.map((n) => ({
    source_canonical_id: seedNodeId,
    target_canonical_id: n.canonical_id,
    relationship: 'web_result',
  }));

  return {
    ...basePayload,
    nodes: [...(basePayload.nodes ?? []), ...newNodes],
    edges: [...(basePayload.edges ?? []), ...newEdges],
  };
}


export interface WebResult {
  name: string; // result title
  url: string; // result URL
  snippet?: string;
}

/**
 * Fetches search results from DuckDuckGo.
 * @param query The seed string to search for.
 * @returns Promise resolving to an array of WebResult objects.
 */
export async function runWebSearch(query: string): Promise<WebResult[]> {
  const endpoint = `https://api.duckduckgo.com/?q=${encodeURIComponent(
    query,
  )}&format=json&no_redirect=1&skip_disambig=1`;

  const resp = await fetch(endpoint);
  if (!resp.ok) {
    throw new Error(`DuckDuckGo request failed: ${resp.status}`);
  }

  const data = await resp.json();
  // The API returns RelatedTopics, which can be nested. Flatten them.
  const flatten = (topics: any[]): any[] =>
    topics.flatMap((t) => {
      if (Array.isArray(t.Topics)) {
        return flatten(t.Topics);
      }
      return t;
    });

  const raw = flatten(data.RelatedTopics ?? []);
  const results: WebResult[] = raw
    .filter((t) => t.FirstURL && t.Text)
    .map((t) => ({ name: t.Text, url: t.FirstURL, snippet: '' }));

  // Limit to 10 results for UI sanity.
  return results.slice(0, 10);
}
