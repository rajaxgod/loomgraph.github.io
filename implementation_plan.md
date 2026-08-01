# Single Critical User Journey: Graph Rendering & Selection

## Goal Description
The core problem Loomgraph solves is rendering relationship graphs. The single most critical user journey the rest of the product depends on is: **The host app provides graph data (nodes/edges), Loomgraph computes the layout, renders the graph using the DOM/SVG tier, and allows the user to interact with it (click to select a node) while applying the 'cartography' UI tokens.**

For Phase 2, I will build this end-to-end flow using the DOM renderer.

## Proposed Changes

### 1. Core Layout Algorithm
- **File:** `packages/core/src/layout/algorithms/force.ts`
- **Summary:** Implement a basic, synchronous force-directed layout algorithm (or a simplified proxy like a spring embedder) that takes `LayoutInput` and returns `LayoutResult` with `x, y` positions for each node.

### 2. Framework-Agnostic DOM Renderer
- **File:** `packages/core/src/renderers/dom/index.ts`
- **Summary:** Implement the `Renderer` interface from `design.md`. It will create an `<svg>` layer for edges and a standard HTML `<div>` layer for nodes, applying the `--loom-*` CSS tokens.

### 3. Viewport & Interaction Controller
- **File:** `packages/core/src/interaction/viewport.ts`
- **Summary:** A simple state container for `{ x, y, zoom }` and a `SelectionState`.

### 4. React Binding
- **File:** `packages/react/src/LoomGraphView.tsx`
- **Summary:** A React component that takes `graph` and `onNodeClick` props. It acts as the glue: instantiating the DOM renderer, invoking the layout algorithm, and mapping React state/events to the Vanilla JS layers.

### 5. Example Host App
- **File:** `examples/react-basic/src/App.tsx` (and Vite setup)
- **Summary:** A minimal React host application providing a hardcoded graph to `<LoomGraphView>`, proving the end-to-end flow works visually.

## Verification Plan
- Run the `react-basic` example app in a browser to visually confirm nodes and edges are drawn on the screen using the cartography theme (`--loom-paper`, `--loom-ink`, etc.).
- Confirm clicking a node changes its state to selected (using `--loom-seal`).
