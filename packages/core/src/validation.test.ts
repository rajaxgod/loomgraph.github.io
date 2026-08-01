import { describe, it, expect } from 'vitest';
import { validateGraph } from './validation';
import type { LoomGraph } from './model';

describe('Validation', () => {
  it('should return no errors for valid graph', () => {
    const graph: LoomGraph = {
      nodes: [{ id: 'A', data: {} }, { id: 'B', data: {} }],
      edges: [{ id: 'e1', source: 'A', target: 'B' }]
    };
    expect(validateGraph(graph)).toHaveLength(0);
  });

  it('should catch missing source nodes', () => {
    const graph: LoomGraph = {
      nodes: [{ id: 'A', data: {} }],
      edges: [{ id: 'e1', source: 'B', target: 'A' }]
    };
    const errors = validateGraph(graph);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/missing source node: B/);
  });

  it('should catch missing target nodes', () => {
    const graph: LoomGraph = {
      nodes: [{ id: 'A', data: {} }],
      edges: [{ id: 'e1', source: 'A', target: 'C' }]
    };
    const errors = validateGraph(graph);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/missing target node: C/);
  });
});
