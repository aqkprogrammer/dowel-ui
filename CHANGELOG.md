# Changelog

This is the changelog. Releases are cut by hand and recorded here; there are no
per-package changelogs, whatever an earlier version of this line claimed.

## 0.4.0

### New components

- **ai-disclosure** — telling someone they are looking at AI. Not one registry
  ships this — not AI Elements, assistant-ui, prompt-kit, CopilotKit or shadcn —
  while every one of them ships the chat surface that needs it.

  The research flagged that this component's case rested on an EU AI Act
  Article 50 claim nobody had read. It was checked before building, and it holds
  more sharply than assumed: Article 50 has applied since 2 August 2026, with
  penalties up to €15M or 3% of worldwide turnover. So the four `kind`s are not
  invented — they are the human-visible situations the Article creates:
  interaction (50(1)), generated and manipulated media (50(4), "deep fakes"),
  and public-interest text, plus the assisted case the same paragraph exempts
  where there is human review.

  What it cannot do is stated in the source, the metadata and on the docs page:
  Article 50(2) requires synthetic output to be marked *in a machine-readable
  format*, in the artifact, by whoever generated it. No React component can do
  that. This is a disclosure control, not a compliance product, and nothing in
  it is legal advice.

  Provenance is rendered as claims, never as proof. "Made with Acme Diffusion 3"
  looks like a fact and is a string somebody put in a file, so the panel names
  who asserts it and says in words whether anyone checked — defaulting to "not
  checked", because a component that stays quiet about verification reads as
  verified. `verified` is supplied, never computed: checking a C2PA manifest
  means parsing signed COSE and walking a certificate chain, which would mean a
  wasm blob in the browser that you cannot read, and cannot be trusted
  client-side anyway, since the page doing the checking is the page making the
  claim.

  The Commission's three icons are free to use without attribution and are
  deliberately not bundled — an official mark inside a component library ends up
  on content nobody checked — so `icon` is a prop. Their own line holds either
  way: using them "does not establish legal compliance by itself".

- **time-range-picker** — the control Grafana, Datadog, Sentry, PostHog,
  Vercel, Honeycomb, Cloudflare and Amplitude each maintain a bespoke copy of,
  and which no React package ships. It looks like a date picker and is not one:
  its value is an expression, `now-6h/h..now`, so it is still the last six hours
  tomorrow, where two resolved timestamps are six hours of last Tuesday forever.
  That is what lets a dashboard URL survive being bookmarked and reloaded.

  The grammar is a deliberate subset of the one those products converged on, and
  the model is pure and separately importable: `resolveTimeRange(expression,
  { now, timeZone })` for anyone who wants to build a query without rendering a
  picker. Two details are the ones every reimplementation gets wrong, and both
  have tests. Snapping rounds the opening side down and the closing side up, so
  `now/d..now/d` is all of today rather than a window of zero length; and day,
  week, month and year offsets are calendar arithmetic, so a month back from the
  31st is the end of a shorter month rather than an overflow into the next one,
  and a day back is the same wall-clock time even where a zone changed offset
  overnight.

  Two omissions are deliberate, on the research's advice: no timezone combobox —
  `timeZone` is a prop, because it is a 400-entry list and a decision an app
  makes once — and no comparison range, which belongs to whatever draws the
  chart.

  An invalid expression says why and is not applied. A chart quietly re-scoping
  itself to a window nobody asked for is worse than one that refuses.

- **diff-viewer** — two versions of a file, side by side or unified, with the
  changed words inside a line marked rather than the whole line flagged, and
  unchanged runs collapsed with the count of what was hidden stated rather than
  silently dropped. Hunks can be accepted or rejected, which is the case Dowel
  exists for: an agent proposing a change to a file. Decisions are controlled —
  the component reports the decision and applies nothing, because writing to a
  file is the application's call.

  The diff algorithm is jsdiff's, not a reimplementation. What every packaged
  *viewer* welds on is a styling strategy — emotion in
  `react-diff-viewer-continued`, HTML strings and a stylesheet in `diff2html` —
  and that is exactly what design tokens cannot reach and what is awkward under
  RSC. jsdiff itself is BSD-licensed, dependency-free, and ships types.

  It renders a semantic table, not a `role="grid"`: a grid would promise
  cell-by-cell arrow navigation that does not exist here and makes no sense for
  reading code. Every row states added, removed or unchanged in text, because a
  plus sign and a green tint are not information, and line numbers are hidden
  from assistive technology — announcing two numbers before every line makes a
  diff unlistenable.

- **log-viewer** — a streaming console: level facets, substring or regex
  filtering with the matches highlighted in place, expandable structured fields,
  and follow mode that detaches when you scroll up. The incumbent,
  `react-lazylog`, was last published in 2022 on `react-virtualized` and cannot
  run on React 19, while still taking around 15,000 downloads a week.

  Two accessibility decisions are deliberate rather than incidental.
  `role="log"` implies `aria-live="polite"`, which is right for a few events and
  unusable for a console — a screen reader would read every line of a build and
  nothing else would be audible — so announcing is off by default and opt-in.
  And virtualization means most rows are simply not in the DOM, which assistive
  technology cannot reach; `onDownload` is the escape, because a viewer that
  pretends the virtual window is the whole log is not honestly accessible.

  Adds `@tanstack/react-virtual`, the second TanStack dependency. It is
  measurement-only and headless; every pixel of DOM, ARIA and filtering is in
  the component's own source.

### Fixed

- **audit:bundle** enforces its source budget per file, which is what its own
  docstring has always said. It summed the whole registry entry instead, which
  was identical for the single-file components that made up the library and only
  diverged once an entry had two files — at which point it failed a component
  for having taken the rule's own advice and split up. Entry totals are still
  reported, and flagged past a looser threshold, so splitting cannot hide bulk.

- **audit:counts** is new, and checks every place the component count is written
  down against the registry. It is stated in two READMEs and the npm
  description, and it has now drifted twice — 52 when there were 56, and 56 when
  there were 60 — shipping wrong to npm both times, because nothing was looking.
  The numbers stay hand-written, since they sit in prose a generator would
  ruin; they are now impossible to get wrong quietly.

- **`dowel --version`** reports the real version. It printed a hardcoded `0.1.0`
  that had drifted from the published release; it is read from the package
  manifest at runtime now, so it cannot fall out of step again.


## 0.3.0

### Naming

- `dowel-cli` is marked private and will not be published. npm refuses the name
  as "too similar to existing package del-cli" — the second refusal on this
  pattern after `dowel` itself, which was too similar to `del` and `bower`. The
  check runs only at publish, so a 404 from the registry proves a name is
  unused, never that it can be claimed. `npx @dowel-ui/cli` is the way in.

### New components

- **ai-approval-request** — the gate between an agent deciding to act and it
  acting, which completes the sequence: plan, approve, execute, account for.
  Two things separate it from the confirmations that exist. The proposed
  arguments are editable, so "approve this but fix the address first" is
  possible — every surveyed implementation returns a boolean over a read-only
  payload, forcing a choice between approving something wrong and denying it
  outright. And it renders while the arguments are still arriving, rather than
  returning null until the tool input completes and showing nothing at the
  moment approval becomes relevant.

- **ai-agent-plan** — what an agent intends to do, and how far through it is.
  Not a stepper: a wizard's steps are fixed, while an agent revises its plan as
  it learns. Revision is therefore the feature rather than an edge case, and a
  structural change is announced — watching a list quietly grow is not the same
  as being told the model added a step. Status changes stay silent, because
  announcing every transition would talk over the reader continuously.

  Pairs with `ai-action-ledger`: the plan is what it intends, the ledger is what
  it did. Approval, the step between them, is still unbuilt.

- **file-upload** — a dropzone over a real `input[type=file]`, plus the queue
  almost nobody ships: per-file progress, cancel, retry with backoff, and a
  concurrency limit. The transport is injected as a single `upload` function, so
  the component never constructs a request — a presigned S3 PUT, a multipart
  POST and tus are all the consumer's to write. `xhrUpload` ships as a working
  example rather than a dependency, and uses XMLHttpRequest because `fetch`
  still cannot report upload progress in any shipping browser.

  Split across two files on purpose: `upload-queue.ts` is the part worth owning
  and is testable without rendering anything.

- **tags-input** — a list of short values: invited emails, allowed domains,
  stop sequences. The behaviour worth shipping is what happens to input that
  fails validation. Every implementation surveyed either refuses to create the
  token or creates it and silently discards it, and both leave the reader with
  a field that did not do what they asked and nothing to correct. Here an
  invalid entry becomes a token like any other, marked and carrying its reason.
  Refusals — duplicates, hitting the limit — are announced rather than looking
  like nothing happened.

  Deliberately no suggestion list. A token field with an anchored listbox is a
  multi-select combobox, and there are already 544 lines of hand-rolled combobox
  ARIA in this library; a second copy would be the kind of duplication that
  drifts. Multi-select belongs in Combobox.

### Motion

- **`--motion-scale`** — one multiplier re-times the whole system, the way
  `--radius-scale` re-proportions every corner. Every duration token derives
  from it, so `0` stops choreography outright and `1.4` makes it deliberate.
- **Reduced motion is now layered rather than blanket.** It collapses the scale,
  which covers everything this library animates, and the `!important` blanket
  that catches consumer animation now exempts `data-motion="indicator"`. A
  spinner and a streaming caret keep reporting at half rate via
  `--motion-scale-indicator`, because a frozen spinner is not a gentler
  experience — it says the application has hung. Three components qualify:
  spinner, the ai-response caret, and progress while indeterminate.
- **`ai-structured-output` fields settle.** "A token arrived" and "this field is
  final" look identical in a streamed object; the settle is that distinction
  made visible. It plays on the transition into settled and never on a field
  that was already final at mount.
- New `pnpm audit:motion`, in `audit:all` and therefore CI. It fails on a
  duration that does not derive from the scale, on a reduced-motion block that
  only overrides rules, and on any component claiming indicator status without
  being on an explicit allowlist. Both failure modes were verified by breaking
  them deliberately.

### Not done

- Origin-aware overlays, which I had proposed as work. All five anchored
  overlays — popover, select, dropdown-menu, tooltip, combobox — already set
  `transform-origin` from Radix. Dialog is centred and modal, so Radix exposes
  no origin for it and it correctly has none. The earlier claim that this was
  half-finished was wrong.

## 0.2.0

### Documentation

- Every published package now has a README. `@dowel-ui/react` shipped 0.1.1 with
  a blank npm page and no keywords, which is the first thing anyone evaluating
  it sees. All four carry one now, with keywords for search.
- The root README claimed the project was "not yet deployed or published" and
  listed phase 2 as "Next" with everything after it "Planned". All nine phases
  were complete, four packages were on npm and the site was live. Rewritten
  against what actually exists.

### New components

Five from the component research, in two tranches.

- **meter** — a measurement against a capacity, `role="meter"` rather than
  `progressbar`. Segment widths are a share of capacity, not of the total.
- **metric-delta** — a KPI with polarity, so rising churn is not painted green,
  and no percentage invented from a zero baseline.
- **record-diff** — field-level before and after for audit entries, taking the
  union of both records so removals are not lost.
- **ai-action-ledger** — what an agent actually did, classified revertible,
  compensable or irreversible. The ecosystem ships pre-execution approval and
  nothing post-execution; this is the other half.
- **ai-structured-output** — an object arriving field by field, with layout
  reserved up front. States plainly that no per-field completion signal exists
  in the stack, and what it infers instead.
- **ai-inline-completion** — ghost text in a real textarea. Scoped to textarea
  and input deliberately: contenteditable would make it an editor.

### Fixed

- Story decorators used `max-w-*` with no width, so inside the docs preview's
  centred grid a component with no intrinsic width collapsed to a few pixels.
  The inline completion field rendered 26px wide.

## 0.1.1

### Naming

- **Fix:** the CLI publishes as `@dowel-ui/cli`, not as an unscoped `dowel`. npm
  refuses that name — "too similar to existing packages del, bower" — under a
  typosquat rule that runs only at publish time. A 404 from the registry proves
  a name is unused; it does not prove the name can be claimed, and nothing short
  of attempting the publish distinguishes the two. Scoped names skip the check.
- `branding` gains `cliPackage` alongside `cliName`. They were the same string
  and so were used interchangeably — the npm package after `npx`, and the binary
  the package installs. They are no longer the same string, and conflating them
  is what let the wrong assumption spread through the docs.
- `init` now closes with the `npx @dowel-ui/cli add button` form. Anyone who
  reached it through npx has no `dowel` on their PATH, so the bare binary was
  pointing them at a command they do not have.

### Packaging

- **Fix:** `@dowel-ui/react` published its entire test and story suite — 110
  files a consumer can never use, a third of the tarball. `@dowel-ui/registry`
  shipped its test file too. Both now exclude them through the `files` field.
  690 files and 1457 kB unpacked become 580 files and 1071 kB.
- New `pnpm audit:package` check, wired into `audit:all`. It asks npm itself
  what it would pack rather than re-deriving the `files` semantics, and fails on
  any test, story, storybook, tsconfig, vitest-config, env or coverage file in a
  publishable package. It found the `@dowel-ui/registry` case immediately.
- The existing bundle audit measures registry source and built modules, neither
  of which is the npm tarball, so nothing in the gate had been looking at what
  actually gets published.

Note: `dowel@0.1.0` was never published — the first publish stopped before
reaching it — so the CLI starts at 0.1.1.

## 0.1.0

### Naming

- The library is now **Dowel**: `@dowel-ui/*` packages and an unscoped `dowel`
  CLI command. The documentation site and registry are hosted on Vercel until a
  custom domain is registered. A dowel is
  the hidden pin that joins two pieces without visible fasteners.
- The `@dowel` scope was already claimed on npm, so the packages publish under
  `@dowel-ui` — the same shape as `@radix-ui` and `@tanstack`. The component
  package is `@dowel-ui/react` rather than `@dowel-ui/ui`, which would have read
  redundantly at every import. The CLI is published unscoped as `dowel`, which
  would have made `npx dowel add button` work without a scope prefix. This turned
  out to be wrong — see 0.1.1.
- **Fix:** `rebrand` hardcoded the original `libname` placeholders for the domain
  and CLI name, so a second rename silently left both untouched. Every
  replacement is now derived from the current `branding.config.ts`, and the
  tokens are matched longest-first so one is never rewritten inside another.
- **Fix:** `check:branding` derived its placeholder list from
  `branding.config.ts`, which `rebrand` rewrites — so after a rename it reported
  the real branding as an unreplaced placeholder. The list now lives in the
  script, which the rebrand does not touch.

### Phase 9 — Audits and polish

- Four runnable audits, enforced in CI: colour contrast, token usage, API
  consistency and bundle size.
- **Fix:** the contrast audit found 88 WCAG failures across the palette. Four
  token values moved so each clears 4.5:1 both as text and as a fill;
  `--warning-foreground` is now light; input borders meet the 3:1 required to
  identify a form control; the ocean, emerald and amber presets were darkened.
- **Fix:** `toolVariants` was not exported, unlike every other cva component.
- `remove` deletes installed components, keeping edited files unless forced and
  refusing to remove one another component still imports. `add` now records
  dependency edges so that check works offline.

### Phase 8 — Blocks

- Eight blocks: login, sign-up, forgot-password, dashboard, admin users,
  settings, pricing and AI chat.
- Blocks are registry entries with their own install location and full
  transitive dependency resolution.
- `CardTitle` gains `asChild`, so a card heading can be set to the level the
  page needs.
- **Fix:** a checkbox inside a `FormField` labelled with a hard-coded `htmlFor`
  had no accessible name.
- **Fix:** heading order — card titles under a page `h1` skipped a level.
- **Fix:** a data table's action column rendered an empty header cell.

### Phase 7 — Documentation site

- A Next.js documentation site built on the library's own components: the ⌘K
  search is `Command`, the code blocks are `CodeBlock`, the nav and theme
  switcher are `Button`, `DropdownMenu` and the token system.
- The site hosts the registry. The CLI installs from it over HTTP, closing the
  loop from component source to someone else's project.
- Component pages are generated from the registry, and previews are the
  Storybook stories, so neither can drift from what ships.
- **Fix:** the package build stripped `"use client"` directives when merging
  modules into chunks, making the published package unusable under React Server
  Components. Output is now unbundled.
- **Fix:** `Button` was missing `"use client"` despite attaching an event
  handler. An audit now checks every component.

### Phase 6 — AI

- Eleven components: Conversation, Message, Response, Prompt Input, Tool Call,
  Reasoning, Sources, Model Selector, Token Usage, Agent Status and Code Block.
  No new dependencies.
- The transcript is an ordered list, not a live region; state is announced
  through a separate polite region. Tests assert the absence of `aria-live`.
- The composer does not submit while an IME composition is active.
- **Breaking (unreleased):** `Message` takes `from` instead of `role`, which
  shadowed the global ARIA attribute and tripped consumers' linters.
- `SelectItem` gains an optional `label` prop, separating what the trigger shows
  from the option's full content.

### Phase 5 — Data

- Seven components: Table, Data Table, Pagination, Command, Empty State,
  Progress and Activity Feed.
- Command implements the ⌘K palette in-house rather than depending on `cmdk`,
  which has had no release since March 2025. Groups hide their heading when all
  their items are filtered out.
- Data Table presents a TanStack Table v9 instance. Its controls declare the
  shape they need, so a table without sorting fails to compile at the sortable
  header instead of crashing at runtime.
- Table is a real `<table>` with a focusable scroll wrapper, so an overflowing
  table is reachable by keyboard.
- **Fix:** hiding a column removed its header but still rendered its cells,
  shifting every row out of alignment with the columns above it.

### Phase 4 — CLI and registry

- `@libname/registry`: a deterministic build that emits static registry JSON
  from the component sources, with a `sha256` content hash per file.
- `@libname/cli`: `init`, `add`, `list` and `update`.
- `add` resolves registry dependencies transitively, installs npm packages, and
  rewrites imports to the project's own path alias.
- Install hashes are recorded from the first release, so `update` can tell a
  file the user edited from one that changed upstream. Re-running `add` is a
  no-op, and never overwrites local edits without `--overwrite`.
- `--registry` accepts an HTTPS URL or a directory, so private mirrors work and
  the tests run against a registry built in the same commit.
- The CLI refuses Tailwind v3, JavaScript projects and non-React projects with a
  message saying what to do instead, rather than producing a broken install.

### Phase 3 — Forms

- Nine form components: Checkbox, Radio Group, Switch, Slider, Select, Form,
  Combobox, Calendar and Date Picker.
- Combobox implements the ARIA combobox pattern directly rather than depending
  on `cmdk`, which has had no release since March 2025.
- Form wires field accessibility with no form-library dependency, and never
  points `aria-describedby` at an element that was not rendered.
- Calendar wraps `react-day-picker` — the phase's only new dependency — as a
  token-driven design layer.
- Date Picker is the first registry entry with transitive dependencies,
  composing Popover, Calendar and Button.
- **Fix:** Slider forwarded no accessible name to its thumbs, so a labelled
  slider was still announced unnamed. Added `thumbLabels` and `thumbValueTexts`.
- **Fix:** Date Picker opened on the current month rather than the month of the
  already-selected date.

### Phase 2 — Interactive components

- Nine overlay and disclosure components: Dialog, Sheet, Drawer, Popover,
  Tooltip, Dropdown Menu, Tabs, Accordion and Toast.
- Toast ships an imperative API (`toast()`, `toast.promise()`) callable from
  outside React, built on Radix Toast rather than on `sonner`.
- Drawer implements drag-to-dismiss on Radix Dialog rather than depending on
  `vaul`, which has had no release since December 2024.
- Overlay motion layer in the theme package: two shared keyframe pairs cover
  every floating surface and every edge-anchored panel.
- `PopoverContent` warns in development when it has no accessible name.
- No new runtime dependencies.

### Phase 1 — Foundation

- pnpm + Turborepo monorepo with `@libname/config`, `@libname/themes` and
  `@libname/ui`.
- Two-tier OKLCH design token system with light/dark modes and seven theme
  presets (default, ocean, emerald, violet, rose, amber, monochrome).
- Ten foundation components: Alert, Avatar, Badge, Button, Card, Input, Label,
  Separator, Skeleton, Spinner.
- Typed registry metadata with an integrity test that verifies declarations
  against real source imports.
- Vitest + Testing Library + axe, Storybook 10 with the a11y addon, ESLint and
  Prettier, and CI running the full quality gate.
