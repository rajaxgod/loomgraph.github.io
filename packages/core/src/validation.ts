import type { LoomGraph } from './model';

export function validateGraph(graph: LoomGraph): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(graph.nodes.map(n => n.id));
  
  if (!graph.nodes || !Array.isArray(graph.nodes)) {
    errors.push('Graph nodes must be an array');
    return errors; // fatal
  }

  if (!graph.edges || !Array.isArray(graph.edges)) {
    errors.push('Graph edges must be an array');
    return errors; // fatal
  }

  graph.edges.forEach(edge => {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} references missing source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references missing target node: ${edge.target}`);
    }
  });

  return errors;
}
