import type { LoomGraph } from '../../model';
import type { LayoutResult } from '../../layout/types';
import type { Viewport } from '../../interaction/viewport';

export interface Renderer {
  mount(container: HTMLElement): void;
  unmount(): void;
  setGraph(graph: LoomGraph, layout: LayoutResult): void;
  updateViewport(viewport: Viewport): void;
  hitTest(screenX: number, screenY: number): string | null;
  setNodeStyle(nodeId: string, style: Record<string, any>): void;
  destroy(): void;
}

export class DomRenderer implements Renderer {
  private container: HTMLElement | null = null;
  private wrapper: HTMLDivElement | null = null;
  private svgLayer: SVGSVGElement | null = null;
  private nodesLayer: HTMLDivElement | null = null;
  
  private graph: LoomGraph = { nodes: [], edges: [] };
  private layout: LayoutResult = { positions: new Map() };
  private viewport: Viewport = { x: 0, y: 0, zoom: 1 };
  
  private nodeElements = new Map<string, HTMLDivElement>();
  private edgeElements = new Map<string, SVGPathElement>();

  public onNodeClick?: (id: string) => void;

  mount(container: HTMLElement): void {
    this.container = container;
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';

    this.wrapper = document.createElement('div');
    this.wrapper.style.position = 'absolute';
    this.wrapper.style.transformOrigin = '0 0';

    this.svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgLayer.style.position = 'absolute';
    this.svgLayer.style.top = '0';
    this.svgLayer.style.left = '0';
    this.svgLayer.style.width = '100%';
    this.svgLayer.style.height = '100%';
    this.svgLayer.style.pointerEvents = 'none';

    this.nodesLayer = document.createElement('div');
    this.nodesLayer.style.position = 'absolute';
    this.nodesLayer.style.top = '0';
    this.nodesLayer.style.left = '0';
    this.nodesLayer.style.width = '100%';
    this.nodesLayer.style.height = '100%';

    this.wrapper.appendChild(this.svgLayer);
    this.wrapper.appendChild(this.nodesLayer);
    this.container.appendChild(this.wrapper);
  }

  unmount(): void {
    if (this.container && this.wrapper) {
      this.container.removeChild(this.wrapper);
    }
    this.wrapper = null;
    this.svgLayer = null;
    this.nodesLayer = null;
  }

  setGraph(graph: LoomGraph, layout: LayoutResult): void {
    this.graph = graph;
    this.layout = layout;
    this.render();
  }

  updateViewport(viewport: Viewport): void {
    this.viewport = viewport;
    if (this.wrapper) {
      this.wrapper.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
    }
  }

  hitTest(screenX: number, screenY: number): string | null {
    // simplified for phase 2 - React binding handles clicks on the nodes directly via events
    return null; 
  }

  setNodeStyle(nodeId: string, style: Record<string, string>): void {
    const el = this.nodeElements.get(nodeId);
    if (el) {
      Object.assign(el.style, style);
    }
  }

  destroy(): void {
    this.unmount();
    this.nodeElements.clear();
    this.edgeElements.clear();
  }

  private render() {
    if (!this.svgLayer || !this.nodesLayer) return;

    // Clear existing
    this.svgLayer.innerHTML = '';
    this.nodesLayer.innerHTML = '';
    this.nodeElements.clear();
    this.edgeElements.clear();

    // Render edges
    this.graph.edges.forEach(edge => {
      const sourcePos = this.layout.positions.get(edge.source);
      const targetPos = this.layout.positions.get(edge.target);
      if (!sourcePos || !targetPos) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${sourcePos.x} ${sourcePos.y} L ${targetPos.x} ${targetPos.y}`);
      path.setAttribute('stroke', 'var(--loom-ink-soft, #4A473E)');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none');
      
      this.svgLayer!.appendChild(path);
      this.edgeElements.set(edge.id, path);
    });

    // Render nodes
    this.graph.nodes.forEach(node => {
      const pos = this.layout.positions.get(node.id);
      if (!pos) return;

      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
      el.style.transform = 'translate(-50%, -50%)'; // center origin
      
      el.style.backgroundColor = 'var(--loom-paper-dim, #DED4BD)';
      el.style.border = '1px solid var(--loom-ink-soft, #4A473E)';
      el.style.borderRadius = '4px';
      el.style.padding = '4px 12px';
      el.style.color = 'var(--loom-ink, #1B1A17)';
      el.style.fontFamily = 'var(--loom-font-ui, Inter, sans-serif)';
      el.style.fontSize = '14px';
      el.style.fontWeight = '500';
      el.style.cursor = 'pointer';
      el.style.userSelect = 'none';
      
      // A11y and tooltip
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      
      // Label
      const label = (node.data.label as string) || node.id;
      el.textContent = label;
      el.setAttribute('title', label); // Hover tooltip delay is native
      el.setAttribute('aria-label', `Node: ${label}`);

      // Selection interactions
      const handleClick = (e: Event) => {
        e.stopPropagation();
        if (this.onNodeClick) this.onNodeClick(node.id);
      };

      el.addEventListener('click', handleClick);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      });

      this.nodesLayer!.appendChild(el);
      this.nodeElements.set(node.id, el);
    });
  }
}
