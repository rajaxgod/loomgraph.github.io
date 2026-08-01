import type { LoomGraph } from '../model';

export function getNeighborhood(graph: LoomGraph, focusNodeId: string, hops: number): LoomGraph {
  if (hops < 0) throw new Error('Hops must be non-negative');

  const nodesMap = new Map(graph.nodes.map((n) => [n.id, n]));
  if (!nodesMap.has(focusNodeId)) {
    return { nodes: [], edges: [] };
  }

  // Adjacency list
  const adj = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.source)!.push(edge.target);
    adj.get(edge.target)!.push(edge.source); // undirected traversal for neighborhood
  }

  const visited = new Set<string>();
  let currentLevel = [focusNodeId];
  visited.add(focusNodeId);

  for (let currentHop = 0; currentHop < hops; currentHop++) {
    const nextLevel: string[] = [];
    for (const nodeId of currentLevel) {
      const neighbors = adj.get(nodeId) || [];
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          nextLevel.push(neighborId);
        }
      }
    }
    currentLevel = nextLevel;
    if (currentLevel.length === 0) break;
  }

  const inducedNodes = Array.from(visited).map((id) => nodesMap.get(id)!);
  const inducedEdges = graph.edges.filter(
    (e) => visited.has(e.source) && visited.has(e.target)
  );

  return { nodes: inducedNodes, edges: inducedEdges };
}
