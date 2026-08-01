# design.md: Loomgraph — Architecture & Implementation Design

**Companion to:** PRD.md
**Scope:** Graph & timeline visualization engine (`@loomgraph/core`, `@loomgraph/react`)

---

## 1. Architecture Overview

Loomgraph is organized as four layers, each independently testable and each with a narrow, explicit interface to its neighbors. This separation is the load-bearing design decision: it's what lets the "one API, tiered internals" promise in the PRD actually hold, and what lets layout computation be offloaded (FR-6) without the renderer caring where the numbers came from.

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Framework Bindings                                      │
│  @loomgraph/react — hooks, components, event wiring               │
│  (future: @loomgraph/vue, @loomgraph/svelte)                     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Interaction & Viewport Controller                       │
│  Pan/zoom state, hit-testing, selection, keyboard nav,             │
│  viewport culling (what's actually visible right now)             │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Renderer (tier-selected)                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                     │
│  │ DOM/SVG   │  │  Canvas   │  │  WebGL     │  ← same Renderer    │
│  │ Renderer  │  │ Renderer  │  │  Renderer  │    interface        │
│  └───────────┘  └───────────┘  └───────────┘                     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Graph Model & Layout                                     │
│  Data model, clustering/aggregation, layout algorithms,           │
│  layout-offload interface (worker/WASM/precomputed)                │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow for a typical render:**
`host app data → Layer 1 (build graph model, decide tier, compute or receive layout) → Layer 2 (chosen Renderer draws it) → Layer 3 (handles user input, updates viewport, may trigger re-layout) → Layer 4 (exposes it all as React hooks/components) → host app`

---

## 2. Layer 1: Graph Model & Layout

### 2.1 Core Data Structures

```typescript
// Framework-agnostic, no rendering concerns leak in here.

interface LoomNode {
  id: string;
  data: Record<string, unknown>;   // host-app payload, opaque to Loomgraph
  groupKey?: string;                // for clustering (FR-4) — e.g. "faction:stark"
  position?: { x: number; y: number }; // present if precomputed/pinned; absent = "layout engine, place me"
  pinned?: boolean;                 // user manually dragged; layout engine must not move it
}

interface LoomEdge {
  id: string;
  source: string;   // LoomNode.id
  target: string;   // LoomNode.id
  data?: Record<string, unknown>;
  weight?: number;   // optional, used by force-layout algorithms if present
}

interface LoomGraph {
  nodes: LoomNode[];
  edges: LoomEdge[];
}
```

### 2.2 Tier Selection Logic

This is the core decision function behind FR-2. It runs once per graph load and again on significant graph-size change (e.g., expanding a neighborhood).

```typescript
type RenderTier = 'dom' | 'canvas' | 'webgl';

interface TierThresholds {
  domMax: number;      // default 300
  canvasMax: number;   // default 3000
  // above canvasMax → webgl
}

function selectTier(nodeCount: number, thresholds: TierThresholds = DEFAULT_THRESHOLDS): RenderTier {
  if (nodeCount <= thresholds.domMax) return 'dom';
  if (nodeCount <= thresholds.canvasMax) return 'canvas';
  return 'webgl';
}
```

**Why these defaults:** DOM/SVG gives the richest per-node styling (CSS, hover states, easy theming) and is fine up to a few hundred simultaneous nodes — this covers the entire Tier 1 and most of Tier 2 scale from the writing-studio blueprint without ever touching Canvas/WebGL. Canvas trades some styling flexibility for throughput. WebGL is reserved for genuine "overview of everything" cases (Tier 3 franchise-scale). Thresholds are host-app-configurable because "a few hundred nodes" tolerance varies by how complex each node's visual is.

**Renderer interface contract (all three tiers implement this):**

```typescript
interface Renderer {
  mount(container: HTMLElement): void;
  unmount(): void;
  setGraph(graph: LoomGraph, layout: LayoutResult): void;
  updateViewport(viewport: Viewport): void;   // pan/zoom state from Layer 3
  hitTest(screenX: number, screenY: number): string | null; // returns node id or null
  setNodeStyle(nodeId: string, style: NodeStyle): void;
  destroy(): void;
}
```

Every tier must satisfy this exact interface. This is what prevents the "leaky abstraction" risk flagged in the PRD — if a capability can't be implemented identically across all three (e.g., WebGL's more limited text rendering), that capability is deliberately excluded from the `Renderer` interface and handled as a tier-specific overlay instead (see §2.5).

### 2.3 Layout Offload Interface (FR-6)

The layout algorithm is a **pure function**, deliberately kept free of DOM/rendering dependencies, so it can run anywhere:

```typescript
interface LayoutInput {
  nodes: Array<{ id: string; groupKey?: string; pinned?: { x: number; y: number } }>;
  edges: Array<{ source: string; target: string; weight?: number }>;
  algorithm: 'force' | 'hierarchical' | 'radial' | 'precomputed';
  bounds?: { width: number; height: number };
}

interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
  clusters?: Map<string, { x: number; y: number; memberIds: string[] }>; // supernode positions
}

// The function itself — no `window`, no `document`, portable to a Worker or WASM.
function computeLayout(input: LayoutInput): LayoutResult;
```

**Three execution contexts, same function:**
1. **Main thread** (small graphs, DOM tier default) — direct call, layout is fast enough not to matter.
2. **Web Worker** (`@loomgraph/core` ships a worker-wrapped version) — `computeLayout` runs off the main thread; Layer 1 posts the `LayoutInput`, receives `LayoutResult` back via `postMessage`. This is the default offload path for Canvas/WebGL tiers.
3. **External/precomputed** — host app runs the equivalent algorithm in Rust (e.g., the writing studio's own backend, per its architecture) and hands Loomgraph a ready-made `LayoutResult` directly, skipping `computeLayout` entirely. This satisfies FR-6's "hand Loomgraph precomputed positions" requirement and is the recommended path for the writing-studio integration specifically, since it already has a Rust backend and Tauri IPC (see §6).

**Incremental layout (FR-5):** `computeLayout` supports a `previousPositions` optional input. When present, the algorithm treats it as a warm start — nodes shared with the previous layout keep their approximate position and the algorithm runs fewer iterations, producing the "settle" animation rather than a jarring re-layout. Below is the interface addition:

```typescript
interface LayoutInput {
  // ...as above
  previousPositions?: Map<string, { x: number; y: number }>;
  maxIterations?: number;  // caller can request a fast approximate pass first,
                            // then a refined pass — this is how FR-5's
                            // "immediate approximate, refine async" behavior is built
}
```

### 2.4 Clustering / Aggregation (FR-4)

Clustering runs as a pre-pass in Layer 1, before the renderer sees anything, when `groupKey` is present on nodes and the current zoom/tier calls for aggregation:

```typescript
function clusterGraph(graph: LoomGraph, zoomLevel: number, clusterThreshold: number): {
  visibleNodes: LoomNode[];       // either raw nodes (expanded) or supernodes (collapsed)
  visibleEdges: LoomEdge[];       // recomputed: edges between collapsed groups become one
                                    // aggregate edge; intra-group edges are hidden
  supernodeMembership: Map<string, string[]>; // supernodeId -> real node ids inside
}
```

Expansion (clicking a supernode, or crossing a zoom threshold) re-runs this with a lower `zoomLevel`/higher effective threshold, revealing the real nodes inside that group. This is purely a Layer 1 view-model transform — the underlying `LoomGraph` the host app supplied never changes; only what Layer 2 is asked to render changes.

### 2.5 Neighborhood Scoping (FR-3)

```typescript
function getNeighborhood(graph: LoomGraph, focusNodeId: string, hops: number): LoomGraph {
  // BFS from focusNodeId up to `hops` edges out; returns induced subgraph.
  // This is the function the host app calls before ever handing a graph to
  // Loomgraph for a "default" scoped view — Loomgraph exposes it as a utility
  // but does not force its use; host app decides scoping policy (FR-3 default
  // threshold behavior lives in the React binding's default props, Layer 4).
}
```

---

## 3. Layer 2: Renderers

### 3.1 DOM/SVG Renderer
- Each `LoomNode` → one SVG `<g>` element (or DOM element for HTML-rich nodes, host-app configurable via a `renderNode` prop at Layer 4).
- Styling via the theming API (CSS custom properties) — this tier gets full CSS: hover states, transitions, arbitrary node content.
- Edge rendering: SVG `<path>`, supports curved/bundled edges for readability at higher densities within this tier's range.
- **Culling:** Layer 3's viewport controller determines which nodes are in/near the visible viewport; DOM renderer only mounts elements for those (virtualized), even though this tier's node-count ceiling is already modest — this keeps pan/zoom smooth right up to the tier boundary rather than degrading gradually.

### 3.2 Canvas Renderer
- Single `<canvas>` element; all nodes/edges drawn imperatively per frame via `CanvasRenderingContext2D`.
- Node appearance defined declaratively (shape, fill, size, label) via the same theming API, translated to canvas draw calls internally — host app doesn't write canvas code.
- `hitTest` implemented via a spatial index (quadtree) over node positions, rebuilt on layout change, queried on pointer events — O(log n) hit-testing rather than iterating all nodes per click.
- Redraws are viewport-culled and frame-rate-limited (requestAnimationFrame-batched); no draw work happens for off-screen nodes.

### 3.3 WebGL Renderer
- **Build-vs-wrap decision (PRD Open Question #1): wrap, don't build from scratch for v1.** Recommendation: build this tier on top of a lower-level WebGL point/line primitive library (e.g., regl or a minimal custom shader set) rather than a full opinionated graph library like sigma.js, to keep the `Renderer` interface contract clean — wrapping a full external graph library risks its API assumptions leaking through. A thin custom WebGL layer (instanced point rendering for nodes, instanced line rendering for edges) is a bounded, well-understood problem (~1,500–2,500 LOC estimate) versus the integration risk of conforming a large external library to Loomgraph's exact interface.
- Text labels are the known WebGL weak point (no native text rendering) — solved via a hybrid approach: WebGL draws nodes/edges, a sparse DOM overlay renders labels only for nodes above a size/zoom/selection threshold (never all 20,000 labels at once — this is also just good UX, since 20,000 simultaneous labels would be unreadable regardless of rendering technology).
- `hitTest` via GPU picking (render a second off-screen buffer with unique colors per node, read back the pixel under the cursor) — standard technique, O(1) regardless of node count.

### 3.4 Fallback Chain
- WebGL2 unavailable → fall back to Canvas tier automatically, log a warning via a host-app-supplied logger callback (never `console.log` directly in a library — respects the "no telemetry" NFR by making all observability opt-in and host-controlled).

---

## 4. Layer 3: Interaction & Viewport Controller

Tier-agnostic. Owns:
- **Viewport state:** `{ x, y, zoom }`, updated by pan (drag) and zoom (wheel/pinch) gestures.
- **Selection state:** single/multi-select, exposed via events (FR-15).
- **Keyboard navigation (§8 accessibility):** maintains a "current focus node" independent of pointer state; arrow keys move focus along graph edges (not spatial position — architecturally simpler and more predictable for screen-reader users); Enter/Space triggers the same action as click.
- **`prefers-reduced-motion` handling:** queries the media feature once at mount; if set, layout "settle" animation (§2.3) is skipped — `computeLayout`'s refined pass result is applied instantly rather than animated.
- **Viewport culling calculation:** given current viewport + zoom, computes the visible world-space bounding box, passed to Layer 2 renderers so each tier can cull independently (DOM: don't mount; Canvas/WebGL: don't draw).

This layer is what makes pan/zoom/select feel identical to the host app regardless of which renderer tier is active underneath — it's the seam where "one API" (PRD FR-2/FR-7) is actually enforced.

---

## 5. Layer 4: React Binding (`@loomgraph/react`)

```typescript
// Primary component
<LoomGraphView
  graph={graph}                          // LoomGraph
  focusNodeId={selectedCharacterId}      // optional — triggers neighborhood scoping
  neighborhoodHops={2}                   // FR-3 default
  clusterBy="groupKey"                   // FR-4, opt-in
  layoutMode="auto" | "force" | "hierarchical" | "precomputed"
  precomputedLayout={layoutResult}        // when layoutMode="precomputed" (writing-studio path)
  theme={customTheme}                     // FR-14
  renderNode={(node) => <CustomCard .../>} // optional, DOM tier only
  onNodeClick={(id) => ...}
  onNodeExpand={(clusterId) => ...}       // FR-15
  onViewportChange={(viewport) => ...}
  reducedMotion="auto" | true | false     // defaults to matchMedia, override available
/>

// Timeline component (FR-8–12), separate component sharing Layer 1's data
// utilities but a distinct rendering path (timelines are not graphs, though
// they reuse windowing/culling logic)
<LoomTimelineView
  events={timelineEvents}                 // { id, dateStart, dateEnd?, confidence, lane? }[]
  lanes={["Main Timeline", "Character A's Arc"]}  // FR-10 parallel timelines
  scaleMode="linear" | "adaptive"          // FR-11 — adaptive compresses sparse eras
  visibleRange={[startDate, endDate]}      // controls windowing (FR-8)
  onRangeChange={(range) => ...}
  highlightEntityId={selectedEntityId}     // FR-12
/>
```

**Hooks exposed for lower-level control** (for host apps that don't want the full pre-built component):
- `useLoomLayout(graph, options)` — returns `LayoutResult`, manages worker lifecycle.
- `useLoomViewport()` — pan/zoom state + handlers, usable with a custom renderer.
- `useLoomSelection()` — selection state management.

---

## 6. Reference Integration: The Writing Studio App

Concretely, for the originating app (from the unified blueprint), the integration is:

1. **Rust backend** computes layout for any subgraph above the offload threshold (per blueprint §2.2 point 3), using the same algorithm logic as `computeLayout` (ported to Rust, or the JS version run in a headless context server-side — implementation choice, not architecturally load-bearing since the `LayoutInput`/`LayoutResult` shapes are the actual contract).
2. Tauri IPC command `compute_graph_layout(input: LayoutInput) → LayoutResult` returns positions to the frontend.
3. Frontend calls `<LoomGraphView layoutMode="precomputed" precomputedLayout={result} .../>`, skipping the JS/worker layout path entirely for large graphs — the Rust backend's speed advantage (per the blueprint's performance budgets) is fully available to Loomgraph without Loomgraph needing to know Rust exists.
4. For small graphs (Tier 1/2, under the DOM-tier threshold), the frontend skips the Rust round-trip entirely and uses `layoutMode="force"` locally — no IPC latency for the common case.
5. Timeline: `timeline_events` table (from the blueprint's data model) maps directly to `LoomTimelineView`'s `events` prop; the `confidence`/`in_universe_source` field from blueprint §5 maps to the `confidence` field in FR-9's data model.

This confirms the layering holds end-to-end: Loomgraph never needs to know about SQLite, Tauri, or entities/factions — it only ever sees `LoomGraph`/`LoomTimelineEvent` shapes.

---

## 7. Package & Repo Structure

```
loomgraph/
├── packages/
│   ├── core/                 # @loomgraph/core — Layers 1–3, framework-agnostic
│   │   ├── src/
│   │   │   ├── model/         # LoomNode, LoomEdge, LoomGraph types
│   │   │   ├── layout/         # computeLayout, worker wrapper, algorithms/
│   │   │   │   ├── force.ts
│   │   │   │   ├── hierarchical.ts
│   │   │   │   └── radial.ts
│   │   │   ├── clustering/     # clusterGraph, supernode logic
│   │   │   ├── renderers/
│   │   │   │   ├── dom/
│   │   │   │   ├── canvas/
│   │   │   │   └── webgl/
│   │   │   ├── interaction/    # viewport controller, keyboard nav
│   │   │   └── timeline/       # windowing, adaptive scale, lane layout
│   │   └── package.json
│   ├── react/                 # @loomgraph/react — Layer 4
│   │   ├── src/
│   │   │   ├── LoomGraphView.tsx
│   │   │   ├── LoomTimelineView.tsx
│   │   │   └── hooks/
│   │   └── package.json
│   └── theme-default/          # shipped default theme, separate so it's swappable
├── apps/
│   └── docs/                   # public docs site with live examples per tier
├── benchmarks/                 # CI perf fixtures — 50/2,000/20,000-node fixtures (PRD §5)
└── examples/
    ├── react-basic/
    └── react-writing-studio/    # reference integration matching §6 above
```

---

## 8. Implementation Milestones (maps to PRD's phased adoption goal)

1. **M1 — Core model + DOM renderer + force layout.** Covers Tier 1/2 fully. Ship `@loomgraph/core` + `@loomgraph/react` with DOM tier only.
2. **M2 — Layout offload interface + Web Worker wrapper.** Validates FR-6's contract before Canvas/WebGL exist, using DOM tier as the test case.
3. **M3 — Canvas renderer + clustering.** Extends range to Tier 3's lower end (~3,000 nodes).
4. **M4 — Timeline component**, independent of graph work, can parallelize with M3.
5. **M5 — WebGL renderer**, per the build-vs-wrap decision in §3.3. Highest-risk, latest milestone — de-risked by M1–M4 already covering the large majority of real-world usage (per blueprint Tier 1/2 being "most of working indie authors' actual output").
6. **M6 — Precomputed-layout path + reference Rust integration example**, validating §6 end-to-end against the writing studio app specifically.
7. **M7 — Public 1.0 release**: docs site, benchmark suite public in CI, second external adopter identified (PRD §5 adoption criterion).

---

## 9. Testing Strategy

| Layer | Test Approach |
|---|---|
| Layer 1 (model/layout/clustering) | Pure unit tests — deterministic given seeded random, no DOM needed |
| Layer 2 (renderers) | Visual regression (Playwright screenshot diff) per tier, run against fixed graph fixtures |
| Layer 3 (interaction) | Playwright interaction tests — simulated pan/zoom/keyboard, assert viewport/selection state |
| Layer 4 (React binding) | @testing-library/react — prop contract tests, ensure `onX` events fire correctly |
| Cross-tier contract | A shared test suite run against all three `Renderer` implementations, asserting identical behavior for `hitTest`, `setGraph`, etc. — this is what actually catches the "leaky abstraction" risk from the PRD |
| Performance | Benchmark suite (PRD §5 targets) runs in CI on every PR against the 50/2,000/20,000-node fixtures; regressions fail the build |
| Accessibility | axe-core automated checks + manual keyboard-only navigation test per release |

---

## 10. Open Design Decisions Carried Forward From PRD

Restating PRD §10 with the design-level answer where this document resolves it:

1. **WebGL: build vs. wrap** → §3.3 recommends a thin custom instanced-rendering layer over wrapping sigma.js/cosmos.gl, to protect the `Renderer` interface contract. Not yet validated by prototype — flagged for M5 spike before committing.
2. **Layout execution context for reference integration** → §6 resolves this for the writing-studio app specifically: Rust backend + precomputed path for large graphs, local Worker/main-thread force layout for small ones. Other adopters choose per their own backend availability.
3. **Minimap/overview UI** → not in M1–M7 above; deferred past 1.0, tracked as a post-launch enhancement.
4. **Pre-1.0 API stability** → recommend standard semver pre-1.0 conventions (0.x = breaking changes allowed on minor bumps, documented in changelog); lock the `Renderer` and `LayoutInput`/`LayoutResult` interfaces specifically before 1.0 since those are the extension points external adopters will build against.