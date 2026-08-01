import { describe, it, expect } from 'vitest';
import type { LoomGraph, LoomNode, LoomEdge, LoomTimelineEvent } from './index';

describe('Data Models', () => {
  it('should support creating and reading nodes and edges', () => {
    const nodeA: LoomNode = { id: 'A', data: { name: 'Alice' } };
    const nodeB: LoomNode = { id: 'B', data: { name: 'Bob' }, pinned: true };
    const edge: LoomEdge = { id: 'e1', source: 'A', target: 'B', weight: 1.5 };

    const graph: LoomGraph = {
      nodes: [nodeA, nodeB],
      edges: [edge],
    };

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.nodes[1].pinned).toBe(true);
    expect(graph.edges[0].weight).toBe(1.5);
  });

  it('should support updating data model payload', () => {
    const node: LoomNode = { id: 'A', data: { status: 'active' } };
    // update data
    node.data.status = 'inactive';
    expect(node.data.status).toBe('inactive');
  });

  it('should support timeline events', () => {
    const event: LoomTimelineEvent = {
      id: 't1',
      dateStart: new Date('2023-01-01').getTime(),
      confidence: 'disputed',
      lane: 'Main',
      data: { title: 'The Great Schism' },
    };

    expect(event.confidence).toBe('disputed');
    expect(event.lane).toBe('Main');
  });
});
