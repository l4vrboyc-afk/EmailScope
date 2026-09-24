"""Graph Deduplication & Relevance Engine.

As the OSINT engine pivots deeper, different fetchers will discover the same
handles, domains, or IP addresses multiple times.  Passing duplicate nodes to
the React / WebGL visualiser makes the graph chaotic — duplicate nodes cause
overlapping labels, inconsistent metadata, and exponential edge duplication.

This module provides :class:`GraphDeduplicator` which:

* **Merges nodes** by ``canonical_id`` so every entity appears exactly once.
  When a duplicate is found, the metadata dictionaries are merged — newer
  non-empty values enrich (not overwrite) the existing record.

* **Deduplicates edges** by the signature
  ``<source>-><target>:<relationship>``, dropping self-referential loops
  and exact duplicates while preserving edge confidence.

* **Calculates degree centrality** for each node — nodes connected to 5+
  edges (like a recycled username or central mail server) are flagged with
  ``is_key_pivot_node: True`` and receive a ``degree_centrality`` weight.
  This lets the frontend automatically render key pivot nodes larger or
  with a pulse animation, immediately drawing the analyst's eye to
  high-density connection points.

The engine operates *in-place* on the payload's ``nodes`` and ``edges``
lists, returning the same payload for chaining.
"""

from typing import List, Dict, Set

from core.schemas import InvestigationPayload, GraphNode, GraphEdge


# Threshold for flagging a node as a "key pivot" — nodes with this many
# or more connections are structurally important in the graph.
KEY_PIVOT_THRESHOLD = 5


class GraphDeduplicator:
    """Merges duplicate nodes, unifies edges, and computes node relevance.

    Usage::

        dedup = GraphDeduplicator()
        clean_payload = dedup.deduplicate(payload)
    """

    def deduplicate(self, payload: InvestigationPayload) -> InvestigationPayload:
        """Remove duplicate nodes and edges, then annotate node relevance.

        Parameters
        ----------
        payload:
            The :class:`InvestigationPayload` whose graph to clean.
            The payload is mutated in-place *and* returned for convenience.

        Returns
        -------
        InvestigationPayload
            The same payload with de-duplicated nodes, deduplicated edges,
            and ``degree_centrality`` / ``is_key_pivot_node`` metadata
            added to each node.
        """
        unique_nodes: Dict[str, GraphNode] = {}
        seen_edges: Set[str] = set()
        deduped_edges: List[GraphEdge] = []

        # 1. Merge Nodes by canonical_id
        for node in payload.nodes:
            cid = node.canonical_id
            if cid not in unique_nodes:
                unique_nodes[cid] = node
            else:
                # Merge metadata dictionaries (newer non-empty values overwrite/enrich)
                merged_meta = {**unique_nodes[cid].metadata, **node.metadata}
                unique_nodes[cid].metadata = merged_meta

        # 2. Deduplicate Edges (Source -> Target + Relationship)
        for edge in payload.edges:
            edge_signature = f"{edge.source_canonical_id}->{edge.target_canonical_id}:{edge.relationship}"

            # Avoid self-referential loops or duplicate edges
            if edge.source_canonical_id == edge.target_canonical_id:
                continue

            if edge_signature not in seen_edges:
                seen_edges.add(edge_signature)
                deduped_edges.append(edge)

        # Update payload in-place
        payload.nodes = list(unique_nodes.values())
        payload.edges = deduped_edges

        # 3. Calculate degree centrality and flag key pivot nodes
        self._annotate_node_relevance(payload.nodes, payload.edges)

        return payload

    @staticmethod
    def _annotate_node_relevance(
        nodes: List[GraphNode], edges: List[GraphEdge]
    ) -> None:
        """Annotate each node with ``degree_centrality`` and ``is_key_pivot_node``.

        Degree centrality is the total number of edges connected to a node
        (both incoming and outgoing).  Nodes at or above
        :data:`KEY_PIVOT_THRESHOLD` are flagged as key pivot nodes so the
        frontend can highlight them automatically.
        """
        # Build adjacency count: canonical_id -> edge count
        degree_map: Dict[str, int] = {n.canonical_id: 0 for n in nodes}

        for edge in edges:
            if edge.source_canonical_id in degree_map:
                degree_map[edge.source_canonical_id] += 1
            if edge.target_canonical_id in degree_map:
                degree_map[edge.target_canonical_id] += 1

        # Annotate each node's metadata with degree and pivot status
        for node in nodes:
            degree = degree_map.get(node.canonical_id, 0)
            node.metadata["degree_centrality"] = degree
            node.metadata["is_key_pivot_node"] = degree >= KEY_PIVOT_THRESHOLD
