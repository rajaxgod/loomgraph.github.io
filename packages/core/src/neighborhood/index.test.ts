import { describe, it, expect } from 'vitest';
import { getNeighborhood } from './index';
import type { LoomGraph } from '../model';

describe('Neighborhood Scoping', () => {
  const mockGraph: LoomGraph = {
    nodes: [
      { id: '1', data: {} },
      { id: '2', data: {} },
      { id: '3', data: {} },
      { id: '4', data: {} },
      { id: '5', data: {} },
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' },
    ],
  };

  it('should return only the focus node for 0 hops', () => {
    const result = getNeighborhood(mockGraph, '2', 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('2');
    expect(result.edges).toHaveLength(0);
  });

  it('should return focus node and immediate neighbors for 1 hop', () => {
    const result = getNeighborhood(mockGraph, '2', 1);
    const nodeIds = result.nodes.map(n => n.id).sort();
    expect(nodeIds).toEqual(['1', '2', '3']);
    const edgeIds = result.edges.map(e => e.id).sort();
    expect(edgeIds).toEqual(['e1', 'e2']); // induced edges between 1, 2, 3
  });

  it('should traverse transitively up to N hops', () => {
    const result = getNeighborhood(mockGraph, '1', 2);
    const nodeIds = result.nodes.map(n => n.id).sort();
    // 1 -> 2 (hop 1) -> 3 (hop 2)
    expect(nodeIds).toEqual(['1', '2', '3']);
  });

  it('should return empty graph if focus node not found', () => {
    const result = getNeighborhood(mockGraph, 'unknown', 2);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});
