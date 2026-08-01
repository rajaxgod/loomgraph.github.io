export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface SelectionState {
  selectedNodeIds: Set<string>;
  focusedNodeId: string | null;
}
