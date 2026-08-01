import type { LayoutInput, LayoutResult } from '../types';

export function computeForceLayout(input: LayoutInput): LayoutResult {
  const positions = new Map<string, { x: number; y: number }>();
  
  // A very rough proxy for a force layout just to get nodes on screen
  // for Phase 2 end-to-end validation.
  // In a real implementation this would use d3-force or similar physics sim.
  
  const width = input.bounds?.width || 800;
  const height = input.bounds?.height || 600;
  
  // Arrange in a simple circle for the dummy layout
  const radius = Math.min(width, height) / 2.5;
  const cx = width / 2;
  const cy = height / 2;
  
  const numNodes = input.nodes.length;
  
  input.nodes.forEach((node, i) => {
    if (node.pinned && node.pinned.x !== undefined && node.pinned.y !== undefined) {
      positions.set(node.id, { x: node.pinned.x, y: node.pinned.y });
    } else if (input.previousPositions && input.previousPositions.has(node.id)) {
      const prev = input.previousPositions.get(node.id)!;
      positions.set(node.id, { x: prev.x, y: prev.y });
    } else {
      const angle = (i / numNodes) * 2 * Math.PI;
      positions.set(node.id, {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      });
    }
  });

  return { positions };
}
