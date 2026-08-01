# PRD: Loomgraph — Open-Source Graph & Timeline Visualization Engine

**Status:** Draft v1
**Owner:** [TBD]
**Extracted from:** Unified Blueprint v2 §2.2 (Graph Visualization at Scale)

---

## 1. Summary

Loomgraph is a standalone, open-source rendering engine for interactive relationship graphs and chronological timelines at scale — from a handful of nodes up through tens of thousands. It is built as the visualization layer for the Lore Architect / Writing Studio project (rendering entity relationship graphs and story timelines), but is architected and licensed as an independent library with no hard dependency on that app, so it can be adopted standalone by any project needing the same capability (other worldbuilding tools, knowledge-graph apps, genealogy software, codebase-dependency visualizers, etc.).

**Core problem it solves:** existing off-the-shelf graph libraries (React Flow with d3-force/elkjs) render correctly at small scale but visibly degrade — dropped frames, sluggish pan/zoom, unusable layout — once a graph exceeds roughly a few hundred simultaneously-rendered nodes. There is no widely-adopted, easy-to-integrate, open-source library that handles the full range from "50 nodes, instant and pretty" to "20,000 nodes, still interactive" with one coherent API. Loomgraph fills that gap.

---

## 2. Goals

1. **Render graphs from ~10 to ~50,000 nodes** without the integrating application needing to switch libraries or rewrite its data layer as scale grows.
2. **Never block the main thread long enough to feel broken.** Pan/zoom/click interactions stay responsive even mid-layout-computation.
3. **One API, tiered internals.** The consuming application calls the same interface regardless of graph size; Loomgraph decides internally whether to use SVG/DOM rendering, WebGL rendering, clustering, or server/worker-computed layout.
4. **Timeline is a first-class citizen, not an afterthought.** Chronological/timeline visualization (including multi-century, multi-branch, and uncertain/disputed dates) is a core supported graph *type*, not a bolted-on separate tool.
5. **Ship as a real open-source project**, not an internal module: versioned, documented, framework-agnostic core with a React binding as the first (not only) integration.

## 3. Non-Goals

- Loomgraph is not a general-purpose charting library (bar/line/pie charts are out of scope — use existing tools like Recharts/D3 for that).
- Loomgraph does not own or persist graph data. It is a rendering/interaction layer only; the consuming app supplies nodes/edges and owns storage.
- v1 does not include a built-in graph *editor* UI (add/remove node forms, property panels) — it renders and handles interaction (pan/zoom/select/expand/collapse); editing UI is the consuming app's responsibility, though Loomgraph exposes the events needed to build one.
- No built-in backend/server — "server-computed layout" (see §6) means Loomgraph ships the algorithm as a portable function the host app runs wherever it wants (Node service, Rust via WASM, worker thread), not a hosted service.

## 4. Target Users

| User | Need |
|---|---|
| **Primary: the Lore Architect / Writing Studio app** | Renders entity relationship graphs (characters, factions, locations) and story/world timelines, at scale from Tier 1 (dozens of entities) to Tier 3 (tens of thousands) |
| **Secondary: other open-source/indie tool builders** | Any app needing interactive graph or timeline visualization at scale without building this from scratch — genealogy tools, personal knowledge-management apps, codebase/dependency visualizers, org-chart tools |
| **Contributors** | Open-source contributors improving layout algorithms, adding framework bindings (Vue, Svelte), or extending renderers |

## 5. Success Criteria

| Metric | Target |
|---|---|
| Renders 50 nodes | <16ms frame time (60fps), no perceptible layout delay |
| Renders 2,000 nodes (2-hop neighborhood, typical mid-size use) | Interactive pan/zoom at 60fps; initial layout <400ms |
| Renders 20,000+ nodes (full-graph overview mode) | Initial paint <1s; pan/zoom stays above 30fps; layout computation does not block UI interaction |
| Timeline: 500+ events across a multi-century span | Windowed rendering keeps only visible-range events in the render tree; scroll/pan stays smooth |
| Bundle size (core, no framework binding) | <50kb gzipped for the DOM/SVG renderer path; WebGL renderer path lazy-loaded, not in the default bundle |
| Adoption (12 months post-launch) | Used in ≥2 projects beyond the originating app (validates it's genuinely reusable, not internally-coupled) |

## 6. Functional Requirements

### 6.1 Graph Rendering
- **FR-1:** Accept a generic `{nodes, edges}` data model, framework- and domain-agnostic (no assumption of "character"/"faction" — those are the host app's node `data` payload).
- **FR-2:** Support three rendering tiers, selected automatically by node count (overridable): **DOM/SVG** (small graphs, richest interactivity/styling), **Canvas** (mid-size), **WebGL** (large/overview). Tier boundaries configurable, sane defaults shipped.
- **FR-3:** Support **neighborhood-scoped rendering**: given a focus node and hop-depth N, render only that induced subgraph. This is the default entry mode for any graph above a configurable node-count threshold.
- **FR-4:** Support **clustering/supernode aggregation**: given a grouping key (e.g., faction, region, arc) present in node data, collapse groups into single supernodes at low zoom, expand on interaction (click or zoom-threshold crossing).
- **FR-5:** Support **incremental/progressive layout**: for large graphs, show an initial fast approximate layout immediately, refine positions asynchronously without blocking interaction (node "settling" animation is acceptable; frozen UI is not).
- **FR-6:** Expose **offloadable layout computation** as a pure, portable function (no DOM dependency) so the host app can run it in a Web Worker, a Rust/WASM module, or a backend service, and hand Loomgraph precomputed `{id, x, y}` positions instead of computing them in the render thread.
- **FR-7:** Standard interactions: pan, zoom, click-select, multi-select, drag (optional per-instance), hover tooltips, keyboard navigation (accessibility, see §8).

### 6.2 Timeline Rendering
- **FR-8:** Render chronological events on a horizontal (or vertical) axis with **windowed/virtualized rendering** — only events within (or near) the visible time range are in the render tree, regardless of total event count.
- **FR-9:** Support **variable time precision and uncertainty**: an event's date may be exact, approximate ("circa"), or disputed/multiple-possible — the data model and rendering must represent this (e.g., a fuzzy-edged marker) rather than assuming every date is a precise point.
- **FR-10:** Support **multiple parallel/branching timelines** in one view (e.g., alternate timelines, multiple characters' concurrent arcs, in-world "Age" structures) with clear visual lanes, not just a single linear axis.
- **FR-11:** Support **non-uniform time scales** — a timeline spanning millennia needs to compress low-density eras and expand dense ones; fixed linear-pixel-per-unit-time breaks for `LOTR`-style multi-age chronology.
- **FR-12:** Filter/highlight events by association (e.g., "show only events involving Entity X") without re-querying the host app — filtering is a rendering-layer concern given the full dataset.

### 6.3 API & Integration
- **FR-13:** Framework-agnostic core (vanilla TS/JS), with a first-class **React binding** as the initial integration target (matching the host app's stack), architected so Vue/Svelte bindings are additive, not a rewrite.
- **FR-14:** Declarative configuration for styling (node/edge appearance) via a theming API — no hardcoded visual assumptions, since this needs to work inside the writing studio's own design system as well as any third-party adopter's.
- **FR-15:** Emit a stable event API (`onNodeClick`, `onNodeExpand`, `onViewportChange`, etc.) so host apps can build their own edit/inspect UI on top.
- **FR-16:** Ship as installable packages (`@loomgraph/core`, `@loomgraph/react`) via a public package registry, semver'd, with a public changelog.

## 7. Non-Functional Requirements

- **Open-source license:** MIT or Apache 2.0 (permissive — maximizes adoption per the "used elsewhere" success criterion). Final choice deferred to legal/maintainer preference, but must be OSI-approved and permissive.
- **No telemetry/network calls** in the library itself — it's a rendering library; any analytics are the host app's responsibility. This matters for adoption by privacy-sensitive projects (including the originating local-first writing app).
- **Accessibility:** keyboard-navigable graph traversal (tab/arrow between connected nodes), ARIA live regions for screen-reader announcement of focus changes, sufficient color-contrast defaults in the shipped theme (see also §8).
- **Browser/runtime support:** modern evergreen browsers; WebGL tier requires WebGL2 with a documented graceful fallback to Canvas tier if unavailable.
- **Documentation:** public docs site with interactive examples at each scale tier, a getting-started guide, and an architecture doc (this pairs with `design.md`).
- **Testing:** visual regression tests per renderer tier; performance benchmark suite runs in CI against fixed node-count fixtures (50 / 2,000 / 20,000) with budgets enforced (ties to §5 success criteria).

## 8. Accessibility Requirements (explicit, not deferred)

Both source blueprint documents this PRD descends from left AI-content accessibility as an open gap; this library should not repeat that pattern for its own surface:
- Every node/edge must be reachable and operable via keyboard alone.
- Focus state must be visually distinct and announced to assistive tech.
- Clustering/supernode expand-collapse must be operable without a mouse.
- Motion (layout "settling" animation, FR-5) must respect `prefers-reduced-motion` and disable/simplify accordingly.

## 9. Risks

| Risk | Notes |
|---|---|
| WebGL tier is a large engineering lift on its own | May justify wrapping an existing WebGL graph primitive (e.g., building on top of `sigma.js` or `cosmos.gl` internals) rather than writing a WebGL renderer from scratch — a build-vs-wrap decision belongs in `design.md`, not this PRD |
| "One API across three render tiers" is a hard abstraction to get right | Risk of leaky abstraction where tier-specific limitations (e.g., WebGL's more limited per-node styling) surface to the API consumer unexpectedly — needs explicit API contract testing across tiers |
| Open-source maintenance burden | A real second consumer (§5 adoption target) is what prevents this from silently becoming single-app-coupled despite the architecture intent — needs a maintenance/governance plan, not just a license file |
| Timeline non-uniform time-scale (FR-11) is a genuinely hard UX problem | Needs early prototyping/user-testing, not just an engineering spec — flagged for design-phase validation |

## 10. Open Questions

1. Build the WebGL renderer from scratch, or wrap/fork an existing primitive (sigma.js, cosmos.gl, or a lower-level WebGL graph library)? (See Risk table — this is the single biggest scope/timeline swing factor.)
2. Where does layout computation actually run in the reference integration — Web Worker (simplest, ships first) or Rust/WASM (fastest, matches the host app's Tauri/Rust backend)? Both are valid per FR-6's "offloadable" design; v1 target needs picking.
3. Is a built-in minimap/overview-in-corner UI (common in large-graph tools) in scope for v1, or a v2 nice-to-have?
4. Versioning/compatibility promise: how aggressively can the API change pre-1.0 vs. post-1.0, given external adopters are a stated goal?

## 11. Relationship to design.md

This PRD defines *what* Loomgraph must do and why. `design.md` (companion document) defines *how*: module architecture, the tiered-rendering decision logic, the layout-offload interface, data structures, and implementation-level detail for each functional requirement above.