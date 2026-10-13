# Component ecosystem expansion — audit and roadmap

**Status:** Batches 0–1 committed; Batch 2 built and verified, not yet committed (2026-10-13)
**Branch:** `feat/ecosystem-expansion`
**Supersedes nothing.** `docs/plans/component-expansion.md` (the motion catalogue,
done in 0.12) and ADR 0014 stay in force; this document is what comes after
them. The brief that prompted it asked for a very broad catalogue, using three
public sites (fancycomponents.dev, lightswind.com, vengenceui.com) as category
references. None of the three states a licence on its index page, so the rule
is stricter than for the 0.12 sources: **category discovery only, no code, no
designs, no assets.** Every item below is written from scratch.

## Contents

1. [Where Dowel is today](#1-where-dowel-is-today)
2. [Categories covered](#2-categories-covered)
3. [What the brief asks for, mapped to what exists](#3-what-the-brief-asks-for-mapped-to-what-exists)
4. [Components worth improving](#4-components-worth-improving)
5. [Reusable animation utilities](#5-reusable-animation-utilities)
6. [Dependencies and tiers](#6-dependencies-and-tiers)
7. [Proposed component metadata](#7-proposed-component-metadata)
8. [Proposed playground controls](#8-proposed-playground-controls)
9. [Performance risks](#9-performance-risks)
10. [Accessibility risks](#10-accessibility-risks)
11. [Roadmap and checklist](#11-roadmap-and-checklist)

---

## 1. Where Dowel is today

| Area          | State                                                                                                                                                                                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Packages      | `@dowel-ui/react` 0.13.1, `@dowel-ui/themes` 0.13.1, `@dowel-ui/cli`, `@dowel-ui/registry`, `@dowel-ui/mcp`, `create-dowel-app` 0.13.0; private: `agentbench`, `browser-tests`, `screen-reader-tests`, `config`, `cli-alias`                                                                                               |
| Components    | **244** (`registry:ui`) — form 56, ai 41, display 37, data 29, feedback 22, effects 22, navigation 19, overlay 14, foundation 2, layout 2. Status: 85 stable, 152 beta, 7 experimental                                                                                                                                     |
| Blocks        | **51** — 34 marketing sections (hero ×6, CTA ×3, FAQ ×4, features ×3, footer ×4, logo ×4, pricing ×4, stats ×2, team ×2, testimonials ×3) and 17 app surfaces (dashboard, analytics, billing, settings, onboarding, auth ×3, AI chat/workspace/dashboard, agent console, admin ×2, CRM, command centre). 4 are Pro         |
| Metadata      | `meta.ts` per item (ADR 0003), checked against real imports by `registry/meta.test.ts`. Registry build derives `props` (TS AST), `capabilities {client, animated}` and `quality` checks                                                                                                                                    |
| CLI           | `init, add (multi), list, remove, update (3-way hash), diff, doctor, audit --fix, plan, agents, login`. Modified files are skipped without `--overwrite`                                                                                                                                                                   |
| MCP           | 6 tools over the same registry JSON: search, get, guide, install command, plan, audit                                                                                                                                                                                                                                      |
| Docs          | Next 16. One dynamic page per component and block, all generated from the registry; live previews are the Storybook stories; props tables from the extracted props; `/playground` with cva-axis and `argTypes` controls; `/generate` (deterministic planner); `/theme-studio`; a constellation map of the dependency graph |
| Themes        | 13 OKLCH presets, light and dark, `--motion-scale`, `--radius-scale`; 598 contrast pairs audited                                                                                                                                                                                                                           |
| Tests         | Vitest + jsdom, coverage thresholds 85/80/85/85 (measured 97/93/97/99). Axe on every story in light and dark in Playwright (~1,350 stories). ~40 visual baselines. VoiceOver and NVDA in CI for `stream-announcer`. Every free item installed into a fresh Next.js app on every PR (`install-all`)                         |
| Audits        | `audit:all`: contrast, tokens, api, bundle (24 kB per source file), package, motion, rtl, counts, installed-imports                                                                                                                                                                                                        |
| Brand visuals | Live only in `apps/docs`: `CosmicLoader` (SVG, SMIL orbits), `CosmicBackground` (static seeded SVG sky), `BrandMark`, `AnimatedFavicon`, and the three.js "Astra" galaxy on the home page. **None of them is installable**                                                                                                 |

## 2. Categories covered

**Strong:** core form controls, overlays, data display and tables, AI and
agent UI (41 components — the deepest AI catalogue of any comparable library),
loaders (6 families covering 128 variants), button micro-interactions, text
entrance effects, card spreads and stacks, Canvas 2D charts (dither family),
marketing and app blocks.

**Partial:** backgrounds (8, mostly particle and CSS; no shader backgrounds,
no patterns, no aurora/mesh), scroll (progress and text reveal only), cursor
(one follower), carousels (3D arc/coverflow, swipe, marquee; **no basic
carousel**), navigation shells (sidebar, rails, docks; no navbar family).

**Missing:** a 3D family, shader backgrounds, scroll-driven layout effects
(parallax, stacking, horizontal scroll), image trails, comparison slider,
colour tools, resizable panels, password strength, the brand's own cosmic
visuals as library components.

## 3. What the brief asks for, mapped to what exists

Legend: ✅ exists at production quality · ➕ exists, extend it · 🆕 missing ·
⏸ deferred (see note)

### A. Core UI

✅ button, input, textarea, checkbox, radio-group, switch, select, combobox,
slider (multi-thumb ranges included), progress, spinner, skeleton, badge,
avatar, card, alert, separator, tooltip, popover, dialog, alert-dialog,
drawer, sheet, tabs, accordion, breadcrumb, pagination, table, data-table,
command, toast, calendar, date-picker (single **and range**), otp-input,
file-upload, file-tree (tree view).
➕ button group / icon button → `toggle-group` and Button's `icon` size cover
it; a `ButtonGroup` layout primitive is worth adding (attached borders).
🆕 input-group (addons), multi-select (combobox has no `multiple`),
color-picker, resizable panels.

### B. Advanced controls

✅ quantity-input (number stepper, units), duration-picker, time-range-picker,
tags-input, secret-field (password input), shortcut-recorder, cron-editor,
expression-editor, nl-filter, stepper (multi-step), reorder-list,
selection-list, scrubber.
➕ quantity-input → currency and percentage via `Intl.NumberFormat` formats.
➕ combobox → `multiple`, async `loadOptions`, `creatable`.
🆕 password-strength, color-palette / gradient editor, contrast checker,
phone input, time-zone select, JSON editor (tree view + text, no Monaco),
filter/query builder, column visibility and density selectors (as
`data-table` toolbar parts), resizable split view, interactive timeline.
⏸ rich text, markdown and code editors: a credible one means a large editor
dependency (ProseMirror/Lexical/CodeMirror). If built, it is a separate
tier-4-sized entry with that dependency declared, never core.

### C. Interactive buttons

✅ magnetic-button, ripple-button, liquid-button, copy-button, hold-button,
share-button, flip-button, morph-button (20+ morphs), effect-button
(slide-arrow, pulse, rotate, shake, glare/shine, text-reveal, expand-ring,
clip-corners), dot-morph-button, notify-button, slide-to-confirm, like-button,
Button `loading`.
🆕 **border-beam** (a light travelling round any border — wraps buttons,
cards, inputs; Batch 1), confetti burst (a `burst` utility usable from any
button), glitch and 3D-press as `effect-button` variants, AI generate button
(composition of border-beam + shimmer-text + loading), speed dial / expandable
FAB.

### D. Typography

✅ text-effect (19 presets: per-character rise, blur, mask reveal, stagger
from centre/edges, wave…), text-swap (rotating words), shimmer-text (shine),
scramble-text, typewriter-text, scroll-reveal-text, number-flow / price-flow
(ticker, count-up).
🆕 gradient-text (animated gradient fill), highlight/underline text (marker
draw-on), letter-swap / rolling text (hover), variable-font hover and
cursor-proximity text, text along a path, text marquee (marquee covers it —
document it).

### E. Cards and layouts

✅ glow-card (pointer glow, grouped), tilt-card, flip-card, expandable-cards,
card-stack, card-spread, photo-stack, product-card, tweet-card,
switchboard-card, time-stack, image-accordion; blocks for pricing, team,
testimonials, stats, bento features.
➕ glow-card → a `spotlight` variant (interior light without the ring).
🆕 bento-grid component (the block exists; the layout primitive does not),
masonry grid, drag-and-drop grid, timeline cards, glass card treatment as a
Card variant rather than a new component.

### F. Backgrounds

✅ stars-background, gravity-stars-background (particle connections — this is
the "neural network"), fireworks-background, hole-background,
hexagon-background, bubble-background, gradient-background, gradient-orb,
gravity-field.
🆕 **cosmic-background** (the brand sky, installable; Batch 1),
**aurora-background** (Batch 1), pattern-background (dots, grid, stripes,
noise, grain — one CSS component with a variant axis), interactive grid
(pointer-reactive cells), light beams / rays, mesh gradient, flow field,
perspective/wave grid (lift the one inside `hero-perspective-grid`),
shader-background (one raw-WebGL engine with presets: plasma, liquid,
nebula, chrome, noise), reusing `shader-transition`'s context, DPR and
fallback handling.

### G. Cursor

✅ cursor-follow.
🆕 image-trail, cursor-spotlight (scoped reveal), particle trail. All scoped
to a container, never `document`-wide, all off for `(hover: none)`.

### H. Scroll

✅ scroll-progress, scroll-reveal-text, minimap-nav.
🆕 scroll-reveal (generic wrapper), parallax, stacking-cards (sticky stack),
horizontal-scroll section, scroll-scrub image sequence. Implementation: CSS
scroll-driven animations (`animation-timeline: view()`) with an
IntersectionObserver fallback; never wheel hijacking.

### I. Carousels and galleries

✅ carousel-3d (arc, coverflow), swipe-carousel, reviews-carousel,
invite-carousel, marquee, image-accordion, book, card-stack.
🆕 **carousel** (the basic one — the biggest single gap in the core set),
comparison (before/after) slider, circular gallery / image ring, cylinder
variant on carousel-3d.

### J. 3D

None today beyond CSS 3D in book, flip-card, carousel-3d, tilt-card.
🆕 CSS-3D first: cube, image ring, device mockup. WebGL later and separately:
globe, model viewer (needs a GLTF loader — `three` as that entry's own
dependency, never the library's).

### K. Navigation

✅ sidebar, tabs (sliding indicator), goo-tabs, magnify-dock, gooey-nav,
radial-nav, rail-nav, browser-tabs, command, breadcrumb, pagination,
minimap-nav.
🆕 navbar family (floating, scroll-aware, glass — one component with
behaviour props), navigation-menu / mega menu (Radix NavigationMenu), bottom
navigation, app-shell block.

### L. AI

✅ conversation, message, prompt-input, suggestions, model-selector,
response (streaming), reasoning, tool, approval-request, agent-plan,
agent-status, sources (citations), token-usage, artifact, branch, loader,
memory-inspector, permission-prompt, code-block, diff-viewer, and more.
🆕 voice input + audio visualiser, workflow graph, model comparison, AI usage
chart (compose dither charts + token-usage as a block).

### M. Blocks

✅ hero, CTA, features, testimonials, pricing, FAQ, footer, auth, dashboard,
analytics, CRM, billing, settings, onboarding, AI workspace / agent console,
admin.
🆕 changelog, careers, contact, integrations, blog, portfolio, developer
portal / API keys, security, commerce, navbar sections.

### Duplicates

No true duplicates in the registry. Two near-overlaps to document rather than
merge: `glow-card` vs a "spotlight card" (one component, add the variant), and
`gravity-stars-background` vs a "neural network" background (same mechanism).

## 4. Components worth improving

| Component                                 | Improvement                                                                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| combobox                                  | `multiple`, async options, creatable                                                                                                |
| glow-card                                 | `spotlight` variant                                                                                                                 |
| carousel-3d                               | `cylinder` variant, autoplay pause when off-screen                                                                                  |
| gravity-stars-background                  | spatial grid for link search (O(n²) today), no per-frame tuple allocation                                                           |
| fireworks-background                      | in-place compaction instead of `filter` / `shift` per frame                                                                         |
| bubble/gradient backgrounds, gradient-orb | pause infinite CSS animation off-screen (`animation-play-state` via IntersectionObserver)                                           |
| orb-face, magnetic-button, escape-button  | window pointermove → rAF-coalesced, passive                                                                                         |
| calendar, agent-data-table                | props tables (re-exported `DayPickerProps`; hook-only export)                                                                       |
| docs `playground.ts`                      | stale comment ("22 of 70" → 167 of 244 declare `argTypes`)                                                                          |
| MCP `search_components`                   | category hint omits `effects`; no synonyms (the planner has them)                                                                   |
| CLI `update`                              | does not pick up new upstream npm or registry dependencies; `installed[].from` records the registry schema version, not the release |

## 5. Reusable animation utilities

What exists and should be reused rather than re-written:

- **`useDitherCanvas`** (`components/dither-canvas`) — the Canvas 2D engine:
  ResizeObserver, DPR cap 2, off-screen and hidden-tab pause, reduced-motion
  still frame, token colour resolution cached until the theme changes, on-demand
  frames. 14 components use it. **Every new canvas effect uses it**, declared
  as `registryDependencies: ["dither-canvas"]`.
- **`createSpring`** (`dither-canvas/dither-engine.ts`) — allocation-free spring
  for canvas state.
- **`shader-transition-engine.ts`** — raw WebGL setup, context-loss handling,
  DPR cap, fallback. The future `shader-background` should share it.
- **React 19 hoisted `<style href precedence>`** for per-component keyframes
  (ADR 0014).
- **`--motion-scale` / `--motion-scale-indicator`** and the reduced-motion
  blanket in `themes/base.css`.

Duplication to retire gradually (not in one sweep — each is a behaviour change
to a shipped component):

- ~24 local `usePrefersReducedMotion` copies (`useSyncExternalStore` +
  `matchMedia`), plus 13 components using motion's `useReducedMotion`.
- 4 hand-rolled rAF + IntersectionObserver + visibility loops (matrix-orb,
  fluid-orb, shader-transition, gravity-field).

**Proposal:** a `registry:hook` item, `use-reduced-motion`, and a second,
`use-in-view`, installed like any component (`registryDependencies`). The
schema already has the `registry:hook` type. New components use them; old
ones migrate when they are next touched.

## 6. Dependencies and tiers

Runtime dependencies used by any component today: `class-variance-authority`,
`radix-ui`, `motion`, `@tanstack/react-table`, `@tanstack/react-virtual`,
`react-day-picker`, `diff`. **No three.js** in the library (only the docs
site's hero). Because the CLI installs per component, a dependency only
reaches a project that installs a component which imports it — that is the
tiering mechanism already, and it is enforced by `meta.test.ts`.

| Tier       | Technique                                                           | Rule                                                                |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1 · CSS    | CSS, SVG, plain React                                               | Default. Server-renderable where possible                           |
| 2 · Motion | `motion`                                                            | Springs from gestures, shared layout, continuous physics (ADR 0014) |
| 3 · Canvas | Canvas 2D via `useDitherCanvas`                                     | Particles, fields, anything with >~100 moving parts                 |
| 4 · WebGL  | Raw WebGL; `three` only when a scene graph or loader is unavoidable | Lazy-mounted, fallback required, `three` declared per entry         |

The npm package's `"."` barrel re-exports everything, but `unbundle: true` +
`sideEffects: false` keep unused tiers out of an app's bundle; a tier-4 entry
must additionally not be imported by any lower-tier component.

## 7. Proposed component metadata

The brief's illustrative `DowelComponentMetadata` maps almost entirely onto
fields that already exist; the source of truth stays `meta.ts` + derivation in
the registry build. Only what cannot be derived is written by hand.

| Brief's field                           | Dowel today                                                  | Action                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| name, category, description, status     | `meta.ts`                                                    | —                                                                                                           |
| dependencies                            | `meta.dependencies` (verified against imports)               | —                                                                                                           |
| peerDependencies                        | react/react-dom only, excluded by design                     | —                                                                                                           |
| props                                   | derived (`props[]`: name, type string, default, description) | **Derive `control`** per prop (below)                                                                       |
| accessibility                           | `meta.a11y` + quality checks                                 | —                                                                                                           |
| responsive, reducedMotion, themeSupport | partly in `quality.checks`                                   | **Derive `tier`** and `reducedMotion` (`"static" \| "scaled" \| "indicator" \| "none"`) into `capabilities` |
| examples                                | stories (rendered by the docs)                               | Emit story names into the item so the MCP and CLI can list them                                             |
| registryEntry                           | `name`                                                       | —                                                                                                           |

New, all optional and additive (no existing consumer breaks):

```ts
// packages/ui/src/registry/schema.ts
export interface ControlHint {
  /** Numeric range for a slider. Without it, numbers get a free input. */
  min?: number;
  max?: number;
  step?: number;
  /** Override the derived kind, e.g. a string prop that is a colour. */
  kind?: "color" | "text" | "select";
  /** Leave a prop out of the playground (callbacks are always left out). */
  hidden?: boolean;
}

interface ComponentMeta {
  // …existing fields…
  /** Playground hints for props whose control cannot be derived from their type. */
  controls?: Record<string, ControlHint>;
}
```

Registry output gains, per prop row, a structured
`control: { kind: "select" | "boolean" | "number" | "text" | "color"; options?: string[]; min?; max?; step? }`
derived from: cva axes and string-literal unions → `select` with `options`;
`boolean` → `boolean`; `number` + hint → `number`; `string` → `text`; anything
else (functions, nodes, objects) → no control. That replaces the docs' separate
`variants.ts` pass, which disagrees with `props.ts` today (first cva only, no
boolean axes). `meta.test.ts` checks every `controls` key names a real prop.

## 8. Proposed playground controls

Today: `/playground` only, select / boolean / number (fixed 0–100), state not in
the URL beyond `?c=`, component pages have Preview | Code (raw source).

Target:

1. **Preview | Controls | Code on every component page**, reusing the
   playground's state model, shown when the component has ≥1 control.
2. Controls derived from `props[].control` (section 7); `argTypes` still win.
3. Number sliders honour `min/max/step`; text and colour inputs; `children`
   editable as text for components whose children are text.
4. **URL state:** every non-default value serialised into the query string
   (`?c=aurora-background&p.speed=0.6&p.intensity=…&theme=ocean&dark=1`),
   parsed back through the same control definitions, so a URL can only set
   values a control could set — no code execution, no arbitrary props.
5. Generated JSX from control state (exists; extend to the new kinds).
6. Reset (exists), copy (exists), light/dark and preset (exist inside the stage).

Example — `aurora-background`: Intensity [slider 0–1], Speed [slider 0–3],
Blur [slider], Colours [select], Fade [select]. `border-beam`: Duration
[slider], Size [slider], Colour [select tone], Reverse [toggle].

## 9. Performance risks

- O(n²) link search and per-frame allocation in `gravity-stars-background`;
  per-frame `filter`/`shift` in `fireworks-background`.
- `shadowBlur` per frame in four canvas backgrounds — expensive at hero sizes.
- Infinite CSS animations never pause off-screen (bubble, gradient,
  gradient-orb, docs cosmic background).
- Window-level, un-coalesced `pointermove` with `getBoundingClientRect` per
  event in orb-face, magnetic-button, escape-button (non-passive in orb-face,
  drag-stepper).
- Files near the 24 kB source budget: emoji-reaction (23.6 kB),
  quantity-input, expression-editor, browser-tabs, grid-reveal, ring-loader,
  cron-editor, reorder-list. Extending them means splitting first.
- Docs: `astra-scene.tsx:182` passes raw `devicePixelRatio`; verify every path
  clamps.
- New-work rules: one rAF per component through `useDitherCanvas`; no
  allocation in the frame loop; DPR ≤ 2; pause off-screen and hidden; a static
  frame for reduced motion; particle counts scale with area and are capped.

## 10. Accessibility risks

- Decorative layers must be `aria-hidden` and `pointer-events: none`, and must
  never sit above interactive content (every new background renders content in
  its own stacking layer above the canvas).
- Cursor effects: never hide the system cursor by default; never document-wide.
- Scroll effects: content must be fully present and readable with animation
  off; no scroll hijacking; sticky stacks must not trap keyboard focus.
- Autoplaying carousels: off by default, pause on hover, focus and when
  off-screen, and a visible pause control (WCAG 2.2.2).
- Text effects that split into characters must keep one accessible name
  (`aria-label` on the wrapper, characters `aria-hidden`) — the existing text
  effects already do this; new ones must too.
- Colour-only signals in charts and status indicators — the `monochrome`
  preset is the standing test.
- Axe in Playwright already runs every story in both modes; new stories are
  covered automatically. Canvas effects have no visual baselines yet.

## 11. Roadmap and checklist

Ordered by value ÷ cost. Each batch is a commit (or PR) that is green on
`typecheck`, `test`, `lint`, `audit:all`, and is checked in the browser at
desktop and mobile widths before it is called done. New components ship
`beta`; nothing new ships `stable` until it has had a release in the wild.

### Per-component definition of done

- [ ] `components/<name>/{<name>.tsx, .test.tsx, .stories.tsx, index.ts, meta.ts}`
- [ ] entry in `registry/components.ts`, `export *` in `src/index.ts`
- [ ] provenance comment ("Original design") at the top of the file
- [ ] tokens only, logical properties, `--motion-scale`, reduced-motion path tested
- [ ] behavioural tests incl. className override, ref, prop forwarding, axe
- [ ] counts in `README.md`, `packages/ui/README.md`, `packages/ui/package.json`
- [ ] `pnpm --filter @dowel-ui/react test`, `pnpm typecheck`, `pnpm lint`, `pnpm audit:all`
- [ ] seen in the docs preview, light and dark, desktop and 375 px

### Batch 1 — brand and the two cheapest high-impact gaps

- [x] `cosmic-background` — the docs sky and orbital mark as an installable,
      configurable canvas background (stars, glow, tilted orbits with bodies,
      pointer parallax). Canvas tier, via `useDitherCanvas`. The docs'
      `CosmicLoader` stays exactly as it is.
- [x] `border-beam` — a light that travels round the border of whatever it
      wraps. CSS tier (`@property` angle + conic gradient mask).
- [x] `aurora-background` — slow, blurred colour bands. CSS tier.

Lessons from Batch 1, carried forward:

- **Tailwind only sees literal class names.** A cva class built with a
  template literal (`` `[--${PREFIX}-from:…]` ``) is never generated, and the
  jsdom tests cannot notice — they see the string. Write arbitrary-property
  classes out in full; check every new effect in a real browser.
- **A hidden preview pane is `document.hidden`**, so canvas effects correctly
  pause there; verifying one needs the pane visible.

### Batch 2 — infrastructure the rest depends on

- [x] `ControlHint` + `meta.controls`; derived `props[].control` (select, boolean,
      number, text, colour) with structured defaults; unit tests for `props.ts`.
      233 of 248 components have at least one control, 1,464 of 2,217 props.
- [x] Fixed on the way: a prop removed from the element with `Omit` and
      redeclared by the component was dropped from its props table — 120 props
      were missing across the library.
- [x] derived `capabilities.tier` (css / motion / canvas / webgl), inherited
      through `registryDependencies`: 193 / 33 / 19 / 3.
- [ ] `capabilities.reducedMotion` — not derivable honestly from source yet;
      left out rather than guessed.
- [x] playground: controls from the registry (the separate cva pass is
      retired), argType ranges honoured, number / text / colour fields, every
      setting in the URL and validated on the way back in, code for composed
      examples.
- [x] Controls panel on every component page, carried into the playground link.
- [x] MCP: every category in the search hint; tier and control ranges in
      `get_component`.
- [ ] Moved to Batch 3: `use-reduced-motion` and `use-in-view` as
      `registry:hook` items. The CLI already installs `hooks/`, but the meta
      checks, build and install smoke test need extending, and they should land
      with their first consumer (the carousel) rather than with none.

### Batch 3 — core gaps

- [ ] `use-reduced-motion` and `use-in-view` as `registry:hook` items (from
      Batch 2), first used by the carousel
- [ ] `carousel` (basic, Embla-free: scroll-snap + buttons + dots + keyboard;
      autoplay opt-in, pauses on hover/focus/off-screen, pause control)
- [ ] `comparison-slider` (before/after, keyboard operable slider role)
- [ ] `color-picker` (OKLCH-aware, palette + input + contrast readout)
- [ ] `resizable` (panels with keyboard handles, `role="separator"`)
- [ ] `password-strength` (rule list + meter; pairs with `secret-field`)
- [ ] combobox `multiple` / async / creatable

### Batch 4 — Background Studio

- [ ] `pattern-background` (dots, grid, stripes, noise, grain)
- [ ] `interactive-grid` (pointer-reactive cells, canvas)
- [ ] `light-beams`, `mesh-gradient`, `flow-field`
- [x] `shader-background` (raw WebGL, fourteen scenes; landed early, 2b30e09)
- [ ] fix the perf items in section 9 for the existing backgrounds
- [x] docs: a backgrounds page (`/docs/backgrounds`, 2b30e09)

### Batch 5 — scroll and cursor

- [ ] `scroll-reveal`, `parallax`, `stacking-cards`, `horizontal-scroll`
- [ ] `image-trail`, `cursor-spotlight`

### Batch 6 — typography and buttons

- [ ] `gradient-text`, `highlight-text`, `letter-swap`, `proximity-text`
- [ ] `effect-button` glitch + press variants; `burst` (confetti) utility
- [ ] glow-card `spotlight` variant; `bento-grid` primitive

### Batch 7 — navigation, AI and blocks

- [ ] `navbar`, `navigation-menu`, `bottom-nav`
- [ ] `voice-input` + `audio-visualizer`, `workflow-graph`, `model-comparison`
- [ ] blocks: changelog, contact, integrations, careers, API keys, navbar
      sections, background-led heroes using Batch 4

### Batch 8 — 3D

- [ ] CSS 3D: `cube`, `image-ring`, `device-mockup`
- [ ] WebGL, separately: `globe` (raw WebGL), `model-viewer` (`three` as its
      own dependency, lazy-mounted, poster fallback)

### Batch 9 — release

- [ ] visual baselines for the new canvas/CSS effects (reduced-motion frame)
- [ ] `install-all` green; changeset (minor); counts; search synonyms
- [ ] `audit:all`; docs build; deploy then publish (`RELEASING.md`)

### Progress

| Batch                                        | Status            | Commit  |
| -------------------------------------------- | ----------------- | ------- |
| 0 Audit (this document)                      | done              | —       |
| 1 Brand + border beam + aurora               | done              | 661ecda |
| 4 (part) shader-background, backgrounds page | done              | 2b30e09 |
| 2 Infrastructure                             | done, uncommitted | —       |
