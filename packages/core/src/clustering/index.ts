import type { LoomGraph, LoomNode, LoomEdge } from '../model';

export function clusterGraph(
  graph: LoomGraph,
  zoomLevel: number,
  clusterThreshold: number
): {
  visibleNodes: LoomNode[];
  visibleEdges: LoomEdge[];
  supernodeMembership: Map<string, string[]>;
} {
  // Simple heuristic: if zoom level is less than threshold, we cluster.
  const shouldCluster = zoomLevel < clusterThreshold;

  if (!shouldCluster) {
    return {
      visibleNodes: graph.nodes,
      visibleEdges: graph.edges,
      supernodeMembership: new Map(),
    };
  }

  const visibleNodes: LoomNode[] = [];
  const supernodeMembership = new Map<string, string[]>();
  const nodeToSupernode = new Map<string, string>();

  // Group nodes by groupKey
  for (const node of graph.nodes) {
    if (node.groupKey) {
      const superId = `cluster-${node.groupKey}`;
      if (!supernodeMembership.has(superId)) {
        supernodeMembership.set(superId, []);
        // Create supernode representation
        visibleNodes.push({
          id: superId,
          data: { isCluster: true, label: node.groupKey },
        });
      }
      supernodeMembership.get(superId)!.push(node.id);
      nodeToSupernode.set(node.id, superId);
    } else {
      visibleNodes.push(node);
      nodeToSupernode.set(node.id, node.id);
    }
  }

  // Aggregate edges
  const edgeMap = new Map<string, LoomEdge>();
  for (const edge of graph.edges) {
    const sSuper = nodeToSupernode.get(edge.source);
    const tSuper = nodeToSupernode.get(edge.target);
    
    // Skip intra-cluster edges
    if (sSuper === tSuper) continue;
    
    if (sSuper && tSuper) {
      const aggregateEdgeId = `${sSuper}::${tSuper}`;
      const reverseId = `${tSuper}::${sSuper}`;
      
      // Undirected aggregation for simplicity in this base logic, or directed? 
      // The PRD doesn't specify directed vs undirected for clusters. We will keep directed.
      if (!edgeMap.has(aggregateEdgeId)) {
        edgeMap.set(aggregateEdgeId, {
          id: aggregateEdgeId,
          source: sSuper,
          target: tSuper,
          weight: edge.weight ?? 1,
        });
      } else {
        const existing = edgeMap.get(aggregateEdgeId)!;
        existing.weight = (existing.weight || 0) + (edge.weight ?? 1);
      }
    }
  }

  return {
    visibleNodes,
    visibleEdges: Array.from(edgeMap.values()),
    supernodeMembership,
  };
}
