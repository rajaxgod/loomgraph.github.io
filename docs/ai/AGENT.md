# AGENT.md

Guidance for AI coding agents (Claude Code, Cursor, Antigravity or similar) working in this repository. Read this before making changes. If something here conflicts with a specific task instruction from a maintainer, the task instruction wins — but flag the conflict rather than silently picking one.

---

## 1. What This Repo Is

Loomgraph is an open-source graph & timeline visualization engine (`@loomgraph/core`, `@loomgraph/react`). Full spec: `PRD.md` (what and why) and `design.md` (how). Read both before non-trivial changes — this file is a supplement to those, not a replacement.

**One-sentence orientation:** a framework-agnostic rendering engine, layered so that graph model/layout (Layer 1), rendering (Layer 2, three interchangeable tiers), interaction (Layer 3), and framework bindings (Layer 4) never leak into each other. If you're about to write code that violates that layering, stop and re-read `design.md` §1 first.

---

## 2. Hard Boundaries (do not cross without explicit maintainer sign-off)

- **Layer 1 (`packages/core/src/model`, `layout/`, `clustering/`) must have zero DOM dependency.** No `window`, `document`, or browser globals. This is what makes the Web Worker and WASM offload paths (`design.md` §2.3) possible. If a change to this layer requires touching the DOM, the change belongs in a different layer — reconsider it, don't add a DOM shim here.
- **The `Renderer` interface (`design.md` §2.2) must stay identical across all three tiers** (`renderers/dom/`, `renderers/canvas/`, `renderers/webgl/`). Do not add a method to one tier's implementation without adding it to all three, or explicitly documenting in the PR why that capability is tier-exclusive and handled as an overlay instead (see `design.md` §2.2 on leaky-abstraction risk). This is the project's single most important invariant — violating it quietly is the failure mode the whole layered architecture exists to prevent.
- **No telemetry, analytics, or network calls anywhere in `packages/core` or `packages/react`.** This is a library, not an app. If observability is needed, it goes through a host-app-supplied logger callback, never a direct `console.log`/`fetch` in library code (see NFR in `PRD.md` §7).
- **No hard dependency on the writing-studio app anywhere in `packages/core` or `packages/react`.** Domain concepts like "character," "faction," or "entity" must never appear in these packages — only in `examples/react-writing-studio/`. If you find yourself importing something entity-shaped into core, that's a sign the abstraction is leaking; escalate rather than route around it.
- **Don't change `LoomNode`/`LoomEdge`/`LayoutInput`/`LayoutResult` shapes without checking `design.md` §10, point 4.** These are the pre-1.0 extension points external adopters will build against; changes here are more expensive than they look.

---

## 3. Where Things Live (map, not prose)

```
packages/core/src/
  model/         → LoomNode, LoomEdge, LoomGraph — pure types, no logic
  layout/        → computeLayout + algorithms/ (force, hierarchical, radial)
  clustering/    → clusterGraph, supernode aggregation
  renderers/     → dom/, canvas/, webgl/ — each implements Renderer identically
  interaction/   → viewport controller, keyboard nav, selection state
  timeline/      → windowing, adaptive scale, lane layout (separate from graph rendering)
packages/react/src/
  LoomGraphView.tsx     → primary graph component
  LoomTimelineView.tsx  → primary timeline component
  hooks/                 → useLoomLayout, useLoomViewport, useLoomSelection
benchmarks/       → CI perf fixtures (50/2,000/20,000-node) — perf regressions fail here
examples/          → react-basic/, react-writing-studio/ (reference integration)
apps/docs/          → public docs site
```

When asked to "add a feature," locate which layer it belongs to using `design.md` §1's data-flow diagram before writing code. Most bugs in a project like this come from a fix landing in the wrong layer (e.g., a DOM-tier-specific fix applied inside Layer 1, which then silently breaks Canvas/WebGL).

---

## 4. Working Conventions

- **Language:** TypeScript, strict mode. No `any` without a `// eslint-disable` comment explaining why — this project's whole value proposition is a stable typed contract for external adopters.
- **Tests live next to what they test** (`*.test.ts` colocated), except the cross-tier contract suite (`design.md` §9), which lives at `packages/core/src/renderers/__contract__/` and is imported by all three tier test files — do not duplicate it per tier.
- **Before modifying a `Renderer` implementation**, run the cross-tier contract suite locally, not just the tier-specific tests. A change that passes DOM tier's own tests but breaks the shared contract is the single most common mistake to guard against here.
- **Before modifying `computeLayout` or its algorithms**, run the benchmark suite (`benchmarks/`). If a change improves visual quality but regresses the 20,000-node budget from `PRD.md` §5, that's a tradeoff for a maintainer to decide, not something to merge silently.
- **New public API surface** (new prop, new exported function, new event) needs a corresponding entry in `apps/docs/` — don't ship an undocumented public API.
- **Commits:** Conventional Commits format (`feat:`, `fix:`, `perf:`, `docs:`, etc.) — this repo's changelog is generated from commit history.
- **Accessibility is not optional polish.** Any new interactive element needs keyboard operability and, where applicable, `prefers-reduced-motion` handling before it's considered done — not as a follow-up ticket. See `PRD.md` §8 and `design.md` §4.

---

## 5. Before Opening a PR, Verify

1. Layer boundaries respected (§2 above) — especially: did anything DOM-shaped leak into `packages/core/src/model` or `layout/`?
2. Cross-tier `Renderer` contract still holds, if you touched any renderer.
3. Benchmarks still pass, if you touched `layout/` or `clustering/`.
4. No new `console.log`/network call snuck into library code.
5. If you added a public API: is it documented, and does it have a test?
6. If you're unsure whether something belongs in `packages/core` vs. an app-specific example — it almost always belongs in the example, not core. Default to keeping core narrow.

---

## 6. What NOT to Do Without Asking

- Don't add a new top-level dependency to `packages/core` without checking the bundle-size budget (`PRD.md` §5: <50kb gzipped for the DOM/SVG path, WebGL lazy-loaded).
- Don't wrap an external full graph library (sigma.js, cosmos.gl, etc.) directly as the WebGL tier's implementation without reading `design.md` §3.3 and §10 first — this was a deliberate build-vs-wrap decision, not an oversight, and reversing it has interface-contract consequences.
- Don't add framework-specific code (React hooks, Vue composables) to `packages/core` — that belongs in the framework binding packages only.
- Don't change default tier thresholds (`domMax`/`canvasMax` in `design.md` §2.2) without running the benchmark suite across all three tiers at the boundary values — these numbers were chosen deliberately, not arbitrarily.
- Don't merge a change that makes `packages/core` depend on `packages/react`, ever — the dependency direction is one-way.

---

## 7. Open Questions You Should Not Try to Silently Resolve

These are flagged as genuinely open in `PRD.md` §10 and `design.md` §10. If a task seems to require an opinion on one of these, surface it rather than picking an answer and proceeding:

- WebGL build-vs-wrap (currently: build thin custom layer — see §6 above, don't reverse casually)
- Minimap/overview UI inclusion timing (currently: deferred past 1.0)
- Vue/Svelte binding timing (currently: not started — React only)
- Pre-1.0 API stability posture on anything outside `Renderer`/`LayoutInput`/`LayoutResult`

---

## 8. Tone for Generated Docs/Comments

Match the existing docs' register: plain, direct, technical — explain *why* a constraint exists, not just *what* it is (see how `design.md` justifies tier thresholds rather than just stating them). Avoid marketing language; this is infrastructure for other developers, not a product pitch.