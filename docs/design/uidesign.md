# uidesign.md: Visual & Interaction Design

**Scope:** Loomgraph's default theme (`@loomgraph/theme-default`) and its embedded context — the graph/timeline canvas as it appears inside the writing-studio app's "Bible Mode" and "Review Mode" (per the unified blueprint's focus-mode design).

---

## 1. Design Brief, Stated Plainly

The subject is a **worldbuilding instrument for authors** — a tool that sits next to a manuscript, not a generic analytics dashboard that happens to render graphs. The people using it are used to thinking in maps, family trees, and timelines drawn by hand — the actual artifacts fantasy and literary authors sketch on paper while plotting. The design should feel like those artifacts, rendered properly: **a cartographer's instrument, not a SaaS dashboard.**

This also has to work for the massive-scale end of the brief (One Piece, Elden Ring, LOTR) — so "hand-drawn map" as a *feeling* has to survive being rendered at 20,000 nodes in WebGL. That tension — intimate/tactile at small scale, legible/fast at massive scale — is the actual design problem, and it's what the token system and signature element below are built to resolve.

**Explicitly rejected directions** (per the calibration warning in this studio's design process): no warm-cream-and-terracotta AI-default palette, no near-black-with-acid-accent, no zero-radius broadsheet grid. None of those connect to *cartography* or *worldbuilding* specifically — they're defaults that would fit any brief, which is exactly the failure mode to avoid here.

---

## 2. Token System

### 2.1 Color — "Ink & Atlas"

A cartographer's palette: aged paper for the reference/codex surface, true ink-black for structure and manuscript prose, one considered accent drawn from wax-seal red rather than a generic brand blue.

| Token | Hex | Use |
|---|---|---|
| `--loom-paper` | `#EDE6D6` | Codex/graph canvas background — aged paper, not stark white |
| `--loom-paper-dim` | `#DED4BD` | Secondary surfaces, panel backgrounds within the codex view |
| `--loom-ink` | `#1B1A17` | Primary text, node borders, edge lines — near-black with a warm undertone, not pure `#000` |
| `--loom-ink-soft` | `#4A473E` | Secondary text, unselected edges, muted UI chrome |
| `--loom-manuscript` | `#151417` | Manuscript editor background (Deep Work / Focus mode) — near-black, distinct from the paper tone, this is the "dark mode for writing" the blueprint calls for |
| `--loom-manuscript-text` | `#E8E3D6` | Manuscript editor text — warm off-white, paper-toned even on the dark surface, so the two modes feel related rather than like two different apps |
| `--loom-seal` | `#A23B2E` | The single accent — wax-seal red. Selection state, active node, primary actions. Used sparingly, never as a background fill at scale |
| `--loom-seal-dim` | `#C97A6C` | Hover states, secondary emphasis on the accent |
| `--loom-gold` | `#9C7A3C` | Reserved for one secondary signal only: uncertain/disputed timeline dates (PRD FR-9) — a muted gold like old map annotation ink, never used for anything else so it stays legible as a distinct signal |

**Discipline rule:** `--loom-seal` appears on at most one focal element per view. This is a deliberate constraint — a graph with dozens of red-highlighted nodes stops meaning anything. Selection is singular; everything else recedes to ink tones.

### 2.2 Typography

| Role | Typeface | Notes |
|---|---|---|
| **Display / manuscript prose** | *Source Serif 4* (or *Lora* as fallback) | A literary serif for the actual writing surface — this is where authors spend hours, it needs to read like a book, not an app |
| **UI / structural chrome** | *Inter* at restrained weights (400/500/600 only, never 700+ in UI) | Humanist sans for panel labels, node metadata, buttons — legible at small sizes on dense codex screens, deliberately unshowy so it doesn't compete with the serif |
| **Data / annotations** | *JetBrains Mono*, used only for entity IDs, timestamps, technical metadata shown to power users | A utility face — appears rarely, signals "this is precise/structural data," not for general UI text |

**Pairing rationale:** serif-for-prose + humanist-sans-for-chrome is a deliberate split matching the blueprint's own stated duality ("Visual Bible, Prose Draft... Clear visual distinction"). The serif carries the emotional register of the actual writing; the sans carries the instrument's structure around it. Neither face is the default "safe" choice for an AI-tool brief (no Inter-everywhere, no generic system-ui stack).

**Scale:** a restrained 6-step type scale (12/14/16/20/28/40px), no arbitrary in-between sizes. Manuscript body text sits at 18px/1.6 line-height minimum — long-form reading comfort takes priority over UI density on that specific surface.

### 2.3 Layout

- **Base unit:** 8px grid throughout.
- **Radius:** a small, consistent 4px radius on cards/nodes/panels — enough to soften a dense graph view, not enough to read as "rounded SaaS card." Sharp corners (0px) reserved specifically for the manuscript editor chrome, reinforcing the "this is a page, not a dashboard" feeling on that surface.
- **Borders over shadows.** A cartographer's instrument uses hairline rules and ink borders (1px `--loom-ink-soft`), not drop-shadows. Shadows are reserved for exactly one purpose: the floating reference sidebar when it overlaps the manuscript, where a real sense of "this panel is above the page" is functionally useful, not decorative.

### 2.4 Signature Element

**The graph canvas itself, rendered as if drawn.** This is the one place the design spends its boldness (per the restraint principle — everything else stays quiet so this reads clearly):

- Nodes render as **ink-mark circles with a slightly irregular hand-drawn edge** (a subtle SVG filter — `feTurbulence`/`feDisplacementMap` at very low amplitude — applied to the DOM/SVG tier's node borders only; Canvas/WebGL tiers approximate this with a pre-baked irregular-edge texture rather than computing displacement per frame, keeping the "drawn" feeling without paying its performance cost at scale).
- Edges render as **hand-ruled lines** — very slightly non-uniform width along their length, evoking a ruler-and-ink connection rather than a perfectly vector-smooth SVG path. Same tier-dependent approach: true per-edge variance at DOM tier, a pre-baked "inked line" texture/shader at Canvas/WebGL tier.
- This treatment is **exclusive to the graph canvas.** UI chrome around it (panels, buttons, sidebar) stays clean and undecorated — the hand-drawn quality is the map, not the frame around the map. This is the "spend boldness in one place" discipline applied literally: one signature element, disciplined restraint everywhere else.
- At WebGL/overview scale (thousands of nodes), the hand-drawn texture naturally recedes — at that zoom level individual node irregularity isn't perceptible anyway, so the "drawn" feeling is carried instead by the paper-toned background and ink-colored edges, which cost nothing extra to render. The signature element is designed to degrade gracefully with scale rather than needing a different visual language at Tier 3.

---

## 3. Component Specifications

### 3.1 Graph Node (default theme)

```
┌─────────────────┐
│  ● Lord Varyn     │  ← ink-mark dot (entity-type color-coded via a small,
│    Character       │     desaturated set — see 3.1.1) + label in Inter 14/500
└─────────────────┘
     ↑ hairline ink border, 4px radius, --loom-paper-dim fill
     ↑ irregular hand-drawn edge treatment (DOM tier)
```

- **Selected state:** border becomes `--loom-seal`, 2px, no fill change (color carries the signal, not a background flood).
- **Hover state:** border shifts to `--loom-seal-dim`, cursor becomes pointer, tooltip appears after 400ms delay (not instant — avoids flicker while panning).
- **Cluster/supernode:** rendered as a slightly larger node with a stacked-paper visual (two faint offset rectangles behind the main shape) signaling "this contains more" — a literal visual metaphor rather than an abstract badge/counter, though a small Inter-mono count label (`"47"`) sits at the bottom-right corner for precision.

**3.1.1 Entity-type color coding:** a small, deliberately desaturated set so it never competes with the `--loom-seal` selection accent —
- Character → `--loom-ink` (default, most common, gets the "neutral" treatment)
- Location → muted forest `#4E5D42`
- Faction/Group → muted slate `#3E5266`
- Item/Artifact → `--loom-gold` (ties visually to "significant/notable," distinct from the disputed-date use since context disambiguates)
- Event → `--loom-seal-dim` (a lighter version of the accent — events are plot-significant, this is intentional but stays subordinate to true selection state)

### 3.2 Timeline

- Horizontal axis rendered as a **single ruled ink line**, with era/age boundaries (per FR-11's adaptive scale) marked as heavier vertical hash marks with hand-lettered-style Inter labels above.
- Events: small ink-mark ticks on the axis; **disputed/uncertain dates** (FR-9) render with a soft `--loom-gold` blur/feather at the mark's edge rather than a sharp tick — visually distinct without needing a legend to explain it.
- **Parallel lanes** (FR-10) stack as separate ruled lines with consistent left-aligned lane labels (Inter 12/500, `--loom-ink-soft`), connected by faint vertical guide lines where events across lanes are causally linked.
- Windowed/virtualized rendering (FR-8) means panning the timeline should feel like unrolling a scroll — a subtle horizontal parallax on the paper-texture background (very low-cost, CSS `background-position` shift, not a real 3D effect) reinforces the physical-object metaphor without any real rendering overhead.

### 3.3 Reference Sidebar (writing-studio integration)

- Floats over the manuscript editor's right edge, `--loom-paper` background against the editor's `--loom-manuscript` — the one moment these two visual modes touch, and the contrast is the point: "you're looking at a card of ink-on-paper reference floating over your page."
- One of the few places shadows appear (§2.3) — a soft, low-opacity ink-tinted shadow, not a generic gray SaaS shadow (`rgba(27, 26, 23, 0.15)`, i.e., a shadow tinted from `--loom-ink`, not neutral gray).
- Collapses to a thin tab at the editor's edge when not in use — a single click/keyboard shortcut expands it, never auto-popping open uninvited mid-flow (respects the blueprint's "Flow State" UX principle — no interruption of writing).

### 3.4 Mode Switcher (Deep Work / Bible Mode / Review Mode)

- A small, quiet segmented control, Inter 14/500, living in a fixed top corner — deliberately unglamorous, since its job is to get out of the way, not announce itself.
- Active mode indicated by an underline in `--loom-seal`, not a filled pill — consistent with the "accent as a thin mark, not a flood" discipline established at the node level.

---

## 4. Motion

Per the restraint principle: motion serves the subject (a drawn map/manuscript feels physical, not app-like) or it doesn't happen.

- **Node layout "settling"** (design.md FR-5): nodes ease into position over ~400–600ms with a gentle ease-out — evokes pieces settling onto a table, not a bouncy UI spring. No overshoot/bounce easing anywhere in this system — it reads as playful-app, which fights the cartographer's-instrument tone.
- **Panel expand/collapse** (reference sidebar, cluster expansion): 200ms ease, no more — quick enough to feel responsive, never a showcase moment.
- **`prefers-reduced-motion` respected everywhere** (per design.md §4 and PRD §8): settling becomes instant positioning, expand/collapse becomes an instant state change with no transition. This is a floor, not a nice-to-have — verified in CI per the design.md testing strategy.
- **No ambient/idle animation.** A worldbuilding tool an author stares at for hours must not have anything moving on its own — this is a hard rule, not a preference, directly serving the blueprint's "Flow State" principle.

---

## 5. Copy & Microcopy

Register: plain, direct, in the vocabulary of writers, not of software.

| Context | Not This | This |
|---|---|---|
| Broken wikilink (blueprint's non-destructive-linking rule) | "Reference error: entity not found" | "This link points to something that's been deleted. Fix it, or leave it broken for now." |
| Continuity checker flag | "Contradiction detected in field validation" | "Lord Varyn wears silver here — but his profile says he lost that rank in Chapter 2." |
| Empty codex (new project) | "No entities yet. Click + to add." | "Nothing mapped yet. Start with your first character, place, or faction." |
| Cluster expand affordance | "Expand (47 nodes)" | "47 more here — open" |
| Save state | "Saved" / "Saving..." | "Saved" / "Saving" (no ellipsis-as-decoration; state, not narration) |

Every label names what the author controls, not what the system is doing internally — consistent with the writing-from-the-user's-side principle: an author "maps a relationship," they don't "create a graph edge."

---

## 6. Accessibility (Visual)

- Minimum contrast: `--loom-ink` on `--loom-paper` = 12.6:1 (well past AA); `--loom-manuscript-text` on `--loom-manuscript` = 11.8:1. Both verified, not assumed.
- `--loom-seal` as a selection indicator is never the *only* signal — selected nodes also get a 2px border-width change (shape, not just color), so color-blind users get a redundant cue.
- Focus rings: visible 2px `--loom-seal` outline with 2px offset on every keyboard-focusable element (design.md §4's keyboard nav), never suppressed via `outline: none` without a replacement.
- The hand-drawn edge/line texture (§2.4) is decorative only — never the sole carrier of information (e.g., disputed dates use both the gold color *and* a distinct softened shape, not texture alone).

---

## 7. Deliverables Checklist for Implementation

- [ ] `@loomgraph/theme-default` package exporting the token set in §2 as CSS custom properties + a TypeScript theme object matching design.md's theming API (FR-14)
- [ ] Node/edge hand-drawn treatment implemented per tier as described in §2.4 (SVG filter for DOM, pre-baked texture for Canvas/WebGL) — flagged as a design-validated but not yet performance-validated approach; benchmark against the 20,000-node fixture before finalizing the Canvas/WebGL texture approach
- [ ] Figma (or equivalent) component library covering: node states (default/hover/selected/cluster), timeline event states (confirmed/disputed), reference sidebar (collapsed/expanded), mode switcher
- [ ] Copy audit of all user-facing strings against §5's register before 1.0