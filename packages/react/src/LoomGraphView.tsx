import React, { useEffect, useRef, useState } from 'react';
import { DomRenderer, computeForceLayout, validateGraph } from '@loomgraph/core';
import type { LoomGraph, LayoutResult, Viewport, SelectionState } from '@loomgraph/core';

export interface LoomGraphViewProps {
  graph: LoomGraph;
  width?: number;
  height?: number;
  onLog?: (level: 'info' | 'warn' | 'error', message: string, data?: any) => void;
}

export const LoomGraphView: React.FC<LoomGraphViewProps> = ({ graph, width = 800, height = 600, onLog }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<DomRenderer | null>(null);
  const [layout, setLayout] = useState<LayoutResult | null>(null);
  const [selection, setSelection] = useState<SelectionState>({ selectedNodeIds: new Set(), focusedNodeId: null });

  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // 1. Initialize Renderer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const renderer = new DomRenderer();
    renderer.mount(containerRef.current);
    
    renderer.onNodeClick = (id) => {
      setSelection(prev => {
        const next = new Set(prev.selectedNodeIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { ...prev, selectedNodeIds: next };
      });
    };

    rendererRef.current = renderer;

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [isComputingLayout, setIsComputingLayout] = useState(false);

  // 2. Compute Layout when graph changes
  useEffect(() => {
    const errors = validateGraph(graph);
    if (errors.length > 0) {
      if (onLog) onLog('error', 'Graph validation failed', errors);
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setIsComputingLayout(true);
    if (onLog) onLog('info', 'Computing force layout started', { nodeCount: graph.nodes.length });

    // In M1, we run a synchronous dummy force layout, but defer it to next tick to show loading
    const timerId = setTimeout(() => {
      const result = computeForceLayout({
        nodes: graph.nodes.map(n => ({
          id: n.id,
          groupKey: n.groupKey,
          pinned: n.pinned && n.position ? n.position : undefined
        })),
        edges: graph.edges,
        algorithm: 'force',
        bounds: { width, height }
      });
      setLayout(result);
      setIsComputingLayout(false);
      if (onLog) onLog('info', 'Computing force layout finished');
    }, 10);

    return () => clearTimeout(timerId);
  }, [graph, width, height]);

  // 3. Update Renderer when layout/graph/viewport changes
  useEffect(() => {
    if (rendererRef.current && layout) {
      rendererRef.current.setGraph(graph, layout);
      rendererRef.current.updateViewport(viewport);
      
      // Re-apply selection styles on re-render
      graph.nodes.forEach(node => {
        const isSelected = selection.selectedNodeIds.has(node.id);
        rendererRef.current!.setNodeStyle(node.id, {
          border: isSelected ? '2px solid var(--loom-seal, #A23B2E)' : '1px solid var(--loom-ink-soft, #4A473E)'
        });
      });
    }
  }, [graph, layout, selection, viewport]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Zooming
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setViewport(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom * zoomFactor) }));
  };

  return (
    <div 
      ref={containerRef} 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{ 
        width: `${width}px`, 
        height: `${height}px`, 
        backgroundColor: 'var(--loom-paper, #EDE6D6)',
        overflow: 'hidden',
        touchAction: 'none',
        position: 'relative'
      }} 
    >
      {validationErrors.length > 0 && (
        <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', backgroundColor: 'var(--loom-seal-dim, #C97A6C)', color: '#fff', padding: '12px', borderRadius: '4px', fontFamily: 'var(--loom-font-ui, Inter, sans-serif)', fontSize: '14px', zIndex: 10 }}>
          <strong>Graph Data Error:</strong>
          <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
            {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {isComputingLayout && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'var(--loom-paper-dim, #DED4BD)', color: 'var(--loom-ink-soft, #4A473E)', padding: '6px 12px', borderRadius: '4px', fontFamily: 'var(--loom-font-ui, Inter, sans-serif)', fontSize: '12px', zIndex: 10 }}>
          Computing layout...
        </div>
      )}

      {graph.nodes.length === 0 && validationErrors.length === 0 && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--loom-ink-soft, #4A473E)', fontFamily: 'var(--loom-font-ui, Inter, sans-serif)' }}>
          Nothing mapped yet. Start with your first character, place, or faction.
        </div>
      )}
    </div>
  );
};
