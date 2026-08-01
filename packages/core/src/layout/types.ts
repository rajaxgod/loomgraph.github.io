export interface LayoutInput {
  nodes: Array<{ id: string; groupKey?: string; pinned?: { x: number; y: number } }>;
  edges: Array<{ source: string; target: string; weight?: number }>;
  algorithm: 'force' | 'hierarchical' | 'radial' | 'precomputed';
  bounds?: { width: number; height: number };
  previousPositions?: Map<string, { x: number; y: number }>;
  maxIterations?: number;
}

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
  clusters?: Map<string, { x: number; y: number; memberIds: string[] }>;
}

export type ComputeLayoutFn = (input: LayoutInput) => LayoutResult;
