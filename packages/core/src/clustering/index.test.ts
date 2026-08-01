import { describe, it, expect } from 'vitest';
import { clusterGraph } from './index';
import type { LoomGraph } from '../model';

describe('Clustering Logic', () => {
  const mockGraph: LoomGraph = {
    nodes: [
      { id: '1', data: {}, groupKey: 'factionA' },
      { id: '2', data: {}, groupKey: 'factionA' },
      { id: '3', data: {}, groupKey: 'factionB' },
      { id: '4', data: {} }, // no group
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', weight: 1 }, // intra-cluster
      { id: 'e2', source: '1', target: '3', weight: 2 }, // inter-cluster
      { id: 'e3', source: '3', target: '4', weight: 1 }, // cluster to node
    ],
  };

  it('should not cluster if zoom >= threshold', () => {
    const result = clusterGraph(mockGraph, 2.0, 1.0);
    expect(result.visibleNodes).toHaveLength(4);
    expect(result.visibleEdges).toHaveLength(3);
    expect(result.supernodeMembership.size).toBe(0);
  });

  it('should cluster nodes by groupKey if zoom < threshold', () => {
    const result = clusterGraph(mockGraph, 0.5, 1.0);
    
    // Nodes: cluster-factionA, cluster-factionB, node 4
    expect(result.visibleNodes).toHaveLength(3);
    
    // factionA contains 1 and 2
    expect(result.supernodeMembership.get('cluster-factionA')).toEqual(['1', '2']);
    
    // Edges: 
    // e1 is hidden (intra-cluster)
    // e2 becomes cluster-factionA -> cluster-factionB
    // e3 becomes cluster-factionB -> node 4
    expect(result.visibleEdges).toHaveLength(2);
    
    const edgeIds = result.visibleEdges.map(e => e.id).sort();
    expect(edgeIds).toContain('cluster-factionA::cluster-factionB');
    expect(edgeIds).toContain('cluster-factionB::4');
    
    // Edge weight should be aggregated
    const edgeAtoB = result.visibleEdges.find(e => e.id === 'cluster-factionA::cluster-factionB');
    expect(edgeAtoB?.weight).toBe(2);
  });
});
