# Component expansion — the motion catalogue

Branch: `feat/component-expansion`. One commit per phase (large phases split
per family), every commit green on `typecheck`, `test` and `audit:all`.

## Goal

Bring every component shown on these seven pages into Dowel:

| Source                                                               | Items                                | Licence                                                             |
| -------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| [smoothui.dev/docs/components](https://smoothui.dev/docs/components) | ~150 components, 29 blocks, 6 themes | MIT © 2024 Eduardo Calvo                                            |
| [bencho.dev](https://bencho.dev/)                                    | 30 interaction blocks + 6 parked     | MIT © 2026 Lorenzo Cabra (blocks only; photos, logo, font excluded) |
| [amicro /buttons](https://amicro.vercel.app/buttons)                 | 35                                   | MIT © 2026 Syed Subhan Uddin                                        |
| [amicro /cards](https://amicro.vercel.app/cards)                     | 12                                   | 〃                                                                  |
| [amicro /carousels](https://amicro.vercel.app/carousels)             | 3                                    | 〃                                                                  |
| [amicro /loaders](https://amicro.vercel.app/loaders)                 | 128                                  | 〃                                                                  |
| [amicro /dither-charts](https://amicro.vercel.app/dither-charts)     | 11                                   | 〃                                                                  |

Roughly **400 source items**. "All of them" means every one of those behaviours
is reachable in Dowel — not 400 registry entries. See _Consolidation_.

## Ground rules

These are the library's existing rules; the expansion does not relax any of
them. Recorded here because 400 items is where drift would start.

1. **Rebuilt, not pasted.** Every item is re-implemented in Dowel's conventions
   (ADR 0004): `cva` variants, `cn()`, semantic tokens only, `"use client"`,
   `data-slot`, logical (RTL-safe) properties, behavioural tests with an axe
   pass, a story per variant. The sources are the behavioural reference.
2. **Attribution.** MIT requires the notice; each ported item lists its source
   in `THIRD_PARTY_NOTICES.md` and in a one-line comment at the top of the file.
3. **Not ported, re-designed from scratch:**
   - bencho's four Pro blocks (Tilt card, Search, Wheel, Command bar) — their
     code sits behind the author's paywall regardless of the licence page, so we
     write our own implementation of the pattern and take nothing from theirs.
   - SmoothUI's three Codrops-derived shaders (Radial Circles, SDF Circle,
     Warped Circle) — Codrops' demo licence forbids redistribution, which a
     registry is. Original shaders with the same kind of effect.
   - Photos in bencho blocks, the Google "G", Maison Neue: replaced.
4. **No trade dress.** Names that are someone else's product become generic:
   Dynamic Island → `island`, Face ID → `scan-loader`, Siri Wave → `voice-wave`,
   Apple Invites → `invite-carousel`, Figma Comment → `comment-bubble`.
5. **Free.** Per ADR 0013 components and page sections are free; nothing here is
   an application surface, so nothing here is Pro.
6. **Motion.** See ADR 0014: CSS first; `motion` only where the behaviour is a
   spring, a drag, a gesture or a shared-layout animation. Keyframes ship with
   the component, not the theme. Reduced motion keeps working unmodified;
   loaders are the only new `data-motion="indicator"` exemptions.

## Consolidation

Where a source ships N copies of one mechanism with different parameters, Dowel
ships **one component with a variant axis**, and every source item is a value
of that axis with its own story. That is how 128 loaders stay reviewable, stay
under the 24 kB-per-file budget, and share one test suite. Where the mechanism
genuinely differs, it is its own component.

Items that duplicate an existing Dowel component (accordion, checkbox, tabs,
dialog, pagination…) are **enhancements to that component**, never a second
`animated-*` copy — two tabs components is a decision every user then has to
make, forever.

## Phases

### Phase 0 — Foundation

Plan, ADR 0014, `THIRD_PARTY_NOTICES.md`, the new `effects` category (schema,
docs grouping). No components.

### Phase 1 — Loaders (amicro 128 + SmoothUI Grid Loader, AI Loader)

| Component      | Variants                                         |
| -------------- | ------------------------------------------------ |
| `dots-loader`  | 24 Dots & Pulses + AI Loader dots                |
| `ring-loader`  | 30 Rings & Spinners                              |
| `bar-loader`   | 19 Bars & Waves + Wave Physics + AI Loader sweep |
| `shape-loader` | 35 Geometric Shapes                              |
| `text-loader`  | 19 Text & Interface                              |
| `grid-loader`  | SmoothUI 3×3 patterns + AI Loader pixel grid     |

Pure CSS/SVG. All six are indicators (they report ongoing state) and are added
to `ALLOWED_INDICATORS`.

### Phase 2 — Buttons (amicro 35 + SmoothUI 5)

| Component          | Covers                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `morph-button`     | 20 morphs, 3 colour morphs, sparkle, ring — driven by state (toggle, transient, hover)                       |
| `effect-button`    | slide-arrow, pulse, rotate, shake, glare, text-reveal, expand-ring, clip-corners (SmoothUI)                  |
| `copy-button`      | Button Copy, Copy Hash; also replaces code-block's private CopyButton (old props kept as deprecated aliases) |
| `magnetic-button`  | Magnetic Button, Magnetic Field                                                                              |
| `dot-morph-button` | Dot Morph Button                                                                                             |
| `focus-blur-links` | Focus Blur Links                                                                                             |

### Phase 3 — Text effects (SmoothUI 29 + text components)

`text-effect` (19 entrance/exit presets as `preset`), `text-swap` (fade
through, per-word crossfade, shared axis X/Y/Z), `shimmer-text` (sweep,
shine), `scramble-text`, `typewriter-text`, `scroll-reveal-text`,
`number-flow` (Number Flow and Price Flow).

Smooth Button (SmoothUI) moved to Phase 8: it is new variants on the
existing Button (soft, gradient, pill, press feedback), not a second button.

### Phase 4 — Cards & carousels (amicro 15 + SmoothUI + bencho)

`card-spread` (9 layouts + mono), `carousel-3d` (arc, coverflow),
`time-stack`, `expandable-cards`, `glow-card`, `tilt-card` (original),
`photo-stack`, `card-stack` (scrollable + bencho), `marquee` (Infinite Slider),
`reviews-carousel`, `invite-carousel`, `swipe-carousel`, `image-accordion`,
`book`, `product-card`.

### Phase 5 — Dither charts (amicro 11)

`dither-canvas` (the shared Canvas 2D engine: cell grid, density field,
DPR cap, rAF paused off-screen, colours resolved from tokens at runtime) and
`dither-donut`, `dither-bar`, `dither-area`, `dither-line`, `dither-heatmap`,
`dither-gauge`, `dither-scatter`, `dither-funnel`, `dither-meter`,
`uptime-matrix`. Device Usage Donut is `dither-donut variant="flat"`.

### Phase 6 — Interaction blocks (bencho 30 + 6 parked)

`magnetic-select`, `goo-ball`, `todo-tower`, `expanding-search` (original),
`palette-generator`, `create-menu`, `canvas-toolbar`, `radial-menu`,
`drag-stepper`, `inline-confirm`, `goo-tabs` (Icon bar), `reorder-list`,
`dial` (original; Wheel), `range-dial`, `liquid-toggle`, `animated-checklist`,
`assignee-picker`, `slide-to-confirm` (+ Power Off Slide), `escape-button`,
`slosh-slider`, `aspect-morph`, `now-playing`, `notify-button`,
`pull-to-refresh`, `magnify-dock`, `tick-progress`, `command-bar` (original),
`selection-list`, `glass-bubble`, `folding-frame`, `browser-tabs`,
`action-node`. (Carousel, Tilt card, Card stack, Image accordion land in 4.)

### Phase 7 — SmoothUI display, AI and navigation extras

`avatar-group`, `app-stack`, `contribution-graph`, `cursor-follow`, `island`,
`exposure-slider`, `comment-bubble`, `star-count`, `gooey-popover`,
`image-metadata`, `image-selector`, `expandable-list`, `morph-surface`,
`photo-tabs`, `rich-popover`, `scrubber`, `social-selector`,
`switchboard-card`, `account-menu`, `notification-badge`, `otp-input`,
`stepper`, `context-menu`, `tweet-card`, `gradient-orb`, `orb-face`,
`pixel-avatar`, `ai-loader`, `ai-suggestions`, `ai-branch`, `ai-artifact`.

SmoothUI's AI Citation and AI Context Meter turned out to be the existing
`InlineCitation` and `ai-token-usage`; they, and the other SmoothUI AI items
that match existing Dowel components, are Phase 8 enhancements.

### Phase 8 — SmoothUI basic UI → existing components

Motion added, API unchanged: accordion, breadcrumb (stagger), checkbox (drawn
check), dialog, drawer, dropdown-menu (spring), file-upload, form (error
messages), input (floating label as an opt-in prop), pagination (active pill),
progress, radio-group (spring dot), select, skeleton, switch (morph), tabs
(sliding indicator), toast, tooltip, tags-input (animated tags), combobox
(Searchable Dropdown). AI Task List / Approval / Diff / Tool Call / Reasoning
map onto the existing AI components the same way.

### Phase 9 — Transitions (SmoothUI 17)

`shader-transition`: one raw-WebGL engine, 16 presets plus the Shader Reveal
engine. Falls back to a cross-fade without WebGL and swaps instantly under
reduced motion.

Only three sources were SmoothUI's own designs (Aperture Blur, Chroma Blur,
Prism Sweep) and are ported. The other thirteen derive from Codrops demos —
SmoothUI's docs and changelog say so for Organic Merge, the SDF stages and the
"Akella" Shader Reveal family — so their shaders are original, written without
reading the source shader code.

### Phase 10 — Marketing blocks and themes

29 blocks (CTA 1–3, FAQ 1–4, Features 1–3, Footer 1–4, Hero 1–6, Logo Cloud
1–4, Pricing 1–3, Stats 1–2, Team 1–2, Testimonials 1–3) as blocks, and the six
SmoothUI themes (candy, indigo, blue, red, orange, green) as presets, each
through `audit:contrast`.

### Phase 11 — Release

Search synonyms, counts, changeset (minor), full `audit:all`, docs build.

## Per-component checklist

- [ ] `components/<name>/{<name>.tsx,.test.tsx,.stories.tsx,index.ts,meta.ts}`
- [ ] entry in `registry/components.ts` and `export *` in `src/index.ts`
- [ ] provenance comment + `THIRD_PARTY_NOTICES.md` row
- [ ] counts: `README.md`, `packages/ui/README.md`, `packages/ui/package.json`
- [ ] loaders only: `ALLOWED_INDICATORS` entry with the reason
- [ ] `pnpm --filter @dowel-ui/react test`, `typecheck`, `pnpm audit:all`

## Progress

| Phase                        | Status | Commit                        |
| ---------------------------- | ------ | ----------------------------- |
| 0 Foundation                 | done   | 218b1ac                       |
| 1 Loaders                    | done   | a31d8c8, e6837d8              |
| 2 Buttons                    | done   | 711963d, 95ab872 (motion dep) |
| 3 Text effects               | done   | 1853932                       |
| 4 Cards & carousels          | done   | c26f15f (docs fix), 25c0cb4   |
| 5 Dither charts              | done   | 742a707                       |
| 6 Interaction blocks         | —      |                               |
| 7 SmoothUI extras            | done   | 3e58cba                       |
| 8 Existing-component motion  | —      |                               |
| 9 Transitions                | done   | this commit                   |
| 10 Marketing blocks & themes | —      |                               |
| 11 Release                   | —      |                               |
