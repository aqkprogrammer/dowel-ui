# Changelog

This is the changelog. Releases are cut by hand and recorded here; there are no
per-package changelogs, whatever an earlier version of this line claimed.

## Unreleased

### Changed

- **The install check runs in CI.** `pnpm install-check` installs every
  registry item into a new Next.js app with this checkout's CLI and builds it,
  on pull requests that touch the library and nightly against the newest
  Next.js.
- **Releases publish from a tag.** Pushing `vX.Y.Z` runs a workflow that
  refuses to continue until the live registry serves that version, publishes
  to npm with trusted publishing, and opens the GitHub release from this
  file. See `RELEASING.md`.
- `audit:installed-imports` fails when two items ship different files under
  one name, the cause of the carousel bug fixed in 0.12.0.

## 0.13.1

Fixes for the accessibility problems the real-browser suite found in 0.13.0.
`@dowel-ui/react` and `@dowel-ui/themes` only; the CLI, the MCP server, the
registry builder and `create-dowel-app` are unchanged at 0.13.0. Components
installed as source get these through `dowel update`.

### Fixed

- **Status and primary text on their own tints reach 4.5:1 in light mode.**
  `text-destructive` on `bg-destructive/10` (and the same for success, warning
  and info) measured 4.14–4.32:1, and primary text on the soft button's 12%
  tint 3.97–4.48:1 in ten of the thirteen presets. The status colours are
  darker in light mode (`red-500` 0.577→0.55, `green-500` 0.53→0.515,
  `amber-500` 0.55→0.535, `blue-500` 0.545→0.525), as is the light-mode primary
  of the default theme and of `amber`, `blue`, `candy`, `emerald`, `green`,
  `indigo`, `ocean`, `orange` and `red` (by 0.005–0.035, with hover and active
  moved by the same step). Dark mode is unchanged. Every such pair now measures
  4.52:1 or better in every preset.
- **The soft button stays readable while hovered and pressed.** Its label now
  steps to `primary-hover` as the tint deepens, and the pressed tint is 20%
  rather than 24%; primary text on the old hover and pressed tints fell to
  3.3–4.4:1. The onboarding block's current-step marker uses a 12% tint, like
  the soft button, instead of 15%.
- **`audit:contrast` checks text on tints.** It now measures each status colour
  on its own 10% tint and primary text on the soft button's tints, over both
  the page and the card, and composites translucent colours the way browsers
  paint them (on gamma-encoded channels). It previously blended in linear
  light, which reads a 10% tint as darker than it renders and would have
  passed these pairs by ~0.3:1. `pnpm audit:contrast --verbose` lists them.
- **The theme studio checks text on tints too.** A colour derived there could
  pass every label check and still fail as text on its own tint, as the shipped
  presets did; the studio now lists primary on the soft button's tints, light
  and dark, alongside the solid states.
- `ai-suggest-mode`: removed text is full-strength, marked by its strike-through
  and tint. Muted text on the darker destructive tint measured 4.4:1 — found by
  the browser suite after the palette change above.
- **`Select` inside `FormControl` had no accessible name.** `FormControl`
  passes the field's id, description and invalid state to its child, and
  `Select`'s root renders no element, so they were dropped and the label
  pointed at nothing. `Select` now passes them on to its trigger.
- **`Conversation`'s transcript could not be scrolled by keyboard** when the
  messages held nothing focusable. It is now a focusable, named region (`label`,
  default "Conversation"), as `Table`'s scroll wrapper already is.
- `ai-loader`: the elapsed-time counter is full-strength muted text instead of `opacity-60` on muted text (2.4:1).
- `pull-to-refresh`: the demo's balance decimals and idle time windows use `text-muted-foreground` instead of a faded foreground (2.2:1).
- `browser-tabs`: the tab strip follows the tone, so an inverted window's inactive tab titles read at 4.5:1 or more instead of 2.1:1.
- `island`: secondary text in the demo views is full-strength, not `opacity-70`, which was 3.34:1 on the primary tone.
- `code-block`: the light-mode highlighted-line band is a 4% tint of the page, so syntax colours on it stay at 4.5:1 or more (`text-info` was 4.08:1).
- `log-viewer`: the Fields toggle is a 24px-tall target instead of 16px; only rows that have one grow, by 2px.
- `image-accordion`: a collapsed panel, which is its own trigger, is never narrower than 24px (it could be 16px).
- `reviews-carousel`: each pagination dot is a 24 × 24 target instead of 16 × 24; the dot itself is unchanged.
- `command-center` block: a resolved incident shows an outline severity badge and muted title instead of fading the row, which took the warning badge to 2.8:1.
- `onboarding` block: a blocked step is no longer faded, so its warning badge has the solid fill instead of a lighter one (3.95:1).
- `selection-list`: item descriptions were the foreground at 45% (2.9:1); they use `text-muted-foreground` (5.3:1 light, 7.4:1 dark), and full-strength text on the inverted fill.
- `slide-to-confirm`: the track label, the control's only visible instruction, was `text-foreground/45` (2.9:1); it is `text-muted-foreground` (5.3:1 light, 7.4:1 dark), and the power shimmer only ever brightens it.
- `confirm-typed`: the action was faded to `opacity-55` (2.2–2.5:1) until the text matched; it stays reachable but is now `aria-disabled` and drawn in the outline style, with a full-contrast label, until it takes its real variant on a match.
- `animated-checklist`: the "Add new task" button was faded to `opacity-34` (2.1:1) and done tasks to `opacity-42` (2.7:1); both use `text-muted-foreground` (5.3:1), and a done task is shown by its tick and strike-through.
- `calendar`: days outside the month, which are selectable, were muted at 50% opacity (2.0:1); they are plain `text-muted-foreground` (5.3:1). The root is now `relative`, so the month navigation sits on the calendar rather than at the edges of the page.
- Stories: the `agent-data-table` selection column has a header name, the
  skeleton loading stories give their label a role to belong to, and the tabs
  stories render the panels their triggers point at.

## 0.13.0

The CLI and the MCP server now work after the install as well as during it,
and coding agents are told which component is right, not only which exist.

- **Security.** The CLI no longer trusts its registry with the filesystem or
  its licence key: paths are confined, keys go only to the registry they were
  issued for, and registry dependencies must be npm packages.
- **The component genome.** Every registry item carries its props, whether it
  needs a client boundary, whether it animates, and its quality checks; 188
  carry guidance on when to use them and what they are confused with.
- **`dowel doctor`, `diff`, `audit` and `plan`**, and the MCP server's
  `audit_code`. `plan --model` asks Claude, with your own credentials.
- **Private registries** with per-registry keys, and governance metadata
  (`owner`, `since`, `deprecated`).
- **In the repository:** real-browser accessibility over every story, visual
  regression, a fresh-app install of every item in CI, and AgentBench, a
  harness for measuring whether agent support helps.

### Added

- **AgentBench** (`packages/agentbench`, private): a harness that runs the same
  prompt in two copies of a project — with Dowel's agent files and MCP server,
  and without — and scores both diffs with `tsc`, `dowel audit`, invented and
  uninstalled imports, recall of expected components, and the jsx-a11y rules.
  Ten tasks, a Claude Code adapter, and `noop`/`reference` adapters that cost
  nothing. No run has been published; `/agentbench` on the site documents the
  method and shows published runs only.
- **Private registries can require a key.** A registry that answers `401` gets
  one retry with the key stored for it, and no other; a public registry never
  receives a key it did not ask for. Keys are stored per registry, so a Pro
  licence and a company key coexist. `login --registry <url>` verifies against
  the registry's index when it has no licence endpoint; `logout --registry`
  removes one key; `whoami` lists them. The MCP server reads `DOWEL_TOKEN` and
  `DOWEL_TOKEN_REGISTRY` for the same.
- **Governance metadata:** an item can declare `owner`, `since`, and
  `deprecated` (version, reason, replacement). Deprecated items still install;
  `add` and `update` name the replacement, `list` and `doctor` mark them, the
  MCP server and agent docs warn off them, and the planners skip them. Custom
  registries can also declare `guidance` and `composesWith`, and the build
  rejects any of these naming an item that does not exist. Upstream guidance
  that names an item the extending registry cannot serve, such as a Pro block,
  is dropped from the inherited copy.
- **`dowel plan "<screen>"`** chooses the blocks and components for a screen you
  describe. `--model` asks Claude to choose, with your own Anthropic
  credentials and the optional peer `@anthropic-ai/sdk`; whatever it names
  that the registry does not have is dropped and reported. Without `--model`
  it uses the built-in planner, which needs nothing.
- **MCP `audit_code`** checks code an agent wrote against the same rules as
  `dowel audit`. `get_component` now says when to use a component, what it is
  confused with, whether it needs a client boundary, and every prop its type
  declares; `search_components` matches on what a component is for.
- The agent files list each component's guidance under it, and the planners
  score it above a description match.
- `create-dowel-app` writes the agent files when it scaffolds.
- **`dowel doctor`** checks a project's setup and prints a checklist: the
  project shape, the import alias against `tsconfig.json`, the tokens in the
  stylesheet, installed files present, npm packages and component dependencies
  installed, a licence for any Pro item, updates available, and stale agent
  docs. It is a checklist, not a score, and it writes nothing.
- **`dowel diff [names…]`** shows how installed files differ from the
  registry's current ones, as a unified diff.
- **`dowel audit [paths…]`** finds Tailwind palette colours, literal colours in
  classes and inline styles, arbitrary sizes off the scale, physical direction
  utilities, and native elements where the Dowel component is installed. It
  skips the files Dowel wrote. `--fix` rewrites the physical utilities, the
  only findings with one exact fix, after asking. `--json` is for CI.
- **The component genome.** Every registry item now carries `capabilities`
  (whether it needs a client boundary, whether it animates), `props` read from
  its type, and the `quality` checks from `/quality`. Items may also declare
  `guidance` (when to use it, when not, what it is confused with) and
  `composesWith`. All optional: older registries parse, and older CLIs ignore
  the new fields.
- The registry now publishes the JSON Schemas its `$schema` fields pointed at:
  `r/schema/registry-item.json` and `r/schema/registry-index.json`.
- The MCP server has contract tests for every tool, and a README.

### Continuous integration

- **Every Storybook story is checked by axe in a real browser**, light and dark,
  with the `color-contrast` and `target-size` rules the jsdom tests cannot
  run (`packages/browser-tests`, ADR 18). It found 140 violations across 82
  stories, recorded as 83 entries in `known-violations.json`, each with a
  reason — 70 of them "to fix". The suite fails on anything new and on any
  entry that no longer occurs, so the list can only shrink. The largest group
  is status text on its own 10% tint (4.1–4.5:1), a pair the palette audit
  never checked.
- **Visual regression** for 42 curated stories — forms, open overlays, data,
  feedback, AI and five blocks — in light and dark, LTR and RTL, compared
  pixel-for-pixel inside the pinned Playwright container (188 images). It
  found the calendar's month navigation anchored to the wrong ancestor.
- Storybook has a **Direction** toolbar global that sets `dir` and wraps the
  story in `DirectionProvider`, so RTL previews mirror the primitives too.
- **Coverage thresholds are enforced** in CI (measured: 97.3% statements,
  93.4% branches, against floors of 85% and 80%).
- **Every free item is installed into a fresh app on every pull request**
  (`scripts/smoke/install-all.mjs`): scaffold, `init`, `add` all of them,
  `tsc --noEmit`, `next build` — the release check that used to be manual.

### Security

- **Registry file paths are confined to their directory.** A path such as
  `ui/../../.bashrc` used to be written outside the project. The registry
  schema now refuses absolute paths, `..`, `.` and empty segments,
  backslashes, colons and NUL, and the CLI checks again where the path meets
  the disk.
- **`remove` only deletes what the CLI could have written.** It used to delete
  any path `components.json` listed. It now refuses, deleting nothing, when an
  entry names a file outside the directories components are installed into.
  Alias directories outside the project, as in a monorepo, still work.
- **The licence key goes only to the registry it was issued for, over HTTPS.**
  The registry an install reads comes from `components.json`, so a cloned
  repository could name its own server, mark an item as licensed, and collect
  the key. `login` now records which registry it verified the key against, and
  the CLI refuses to send the key anywhere else. Keys stored before this change
  belong to the default registry. `DOWEL_TOKEN` belongs to the default registry
  unless the new `DOWEL_TOKEN_REGISTRY` names another.
- **Registry dependencies must be npm package names**, optionally with a
  version range. A `git+https:` URL, a tarball or a local path is refused
  instead of being handed to the package manager.
- **Item names are validated** wherever they arrive from, including the
  command line, before they become a URL or a file path.

### Fixed

- `remove theme --force` deleted the project's whole stylesheet, because
  `init` records it under `theme`. The stylesheet is now never deleted.
- `update` failed with ENOENT restoring a file whose directory had been
  deleted.
- Registry and licence requests time out after 30 seconds instead of waiting
  indefinitely.
- The MCP server's `install_command` said a Pro item was "not found"; it now
  resolves it from the index and says it needs a licence. Unknown names are
  all reported together, with suggestions, and a name like `../package` is
  refused rather than read from outside the registry.
- `audit:rtl` skipped a physical utility whenever a class such as `bg-muted`
  sat within a dozen characters before it. No component had such a bug hiding;
  the check is now exact.
- The CLI and scaffolder state Node 20.12 as their floor, which their prompts
  library requires, and CI runs the built binaries on Node 20 and 22.

## 0.12.0

Twenty-four animated components from Animate UI's patterns, 244 in all (up
from 220). Also fixes `sheet` and `drawer` dimming their own panel, and
`swipe-carousel` breaking the other carousels when installed after them.

### Added

Twenty-four animated components whose patterns come from Animate UI. All are
original implementations: Animate UI's licence (MIT with the Commons Clause)
does not allow redistribution, so none of its code was used. See
`THIRD_PARTY_NOTICES.md`. Animate UI items Dowel already covered, such as tabs,
tooltip, accordion and the copy, icon and theme-toggler buttons, were not
added again. All 24 are `beta`, and all of them stop or settle under reduced
motion.

- **Overlays:** `alert-dialog` (springs up out of a blur, and the destructive
  tone shakes its icon once), `hover-card` (grows from its trigger with an
  overshoot, and can stagger its contents) and `preview-link-card` (a link
  whose preview image wipes in from a shimmer; nothing is fetched).
- **Form controls:** `toggle` (squishes when pressed, and its fill pours out
  from the centre), `toggle-group` (a sliding highlight in single mode,
  per-item springs in multiple mode), `flip-button`, `ripple-button`,
  `liquid-button` (rolling liquid fill with an inverting label) and
  `share-button` (opens into a staggered row of targets, including copy-link
  and the native share sheet).
- **Data and navigation:** `file-tree` (the full ARIA tree pattern, with
  folders that tilt open, a drawn guide rail and a gliding selection),
  `code-tabs` (`syncKey` switches every instance on the page together and
  remembers the choice), `pin-list`, `management-bar` (a floating bulk-actions
  toolbar with rolling counts) and `radial-nav`.
- **Display and feedback:** `flip-card` (leans toward the pointer, lifts as it
  turns, and a sheen sweeps across), `radial-intro` (avatars spiral out into
  an orbiting ring) and `notification-list` (a receding deck that springs open
  into a list, with swipe-to-dismiss and an always-available dismiss button).
- **Backgrounds:** `stars-background`, `gravity-stars-background`,
  `fireworks-background` and `hole-background` draw through the
  `dither-canvas` engine, so they inherit its DPR cap, pause when off-screen
  or in a hidden tab, and take their colours from the theme.
  `bubble-background`, `gradient-background` (linear, aurora and mesh) and
  `hexagon-background` are CSS-first.

### Changed

- **Generate and the MCP server** find the new components from the words
  people use for them — "file explorer", "link preview", "are you sure",
  "bulk actions", "fireworks", "honeycomb" and others now reach them.
- **The components page** features `fireworks-background`, `file-tree` and
  `flip-card`.
- **`button`, `badge`, `label`, `avatar`, `input`, `separator` and
  `data-table`** now mark their root with `data-slot`, like every other
  component. They were the exceptions, so tooling that finds a component's
  parts in rendered markup — the docs site's "Parts" view on block pages —
  could not see them. A `data-slot` passed by the caller still wins, so
  wrappers such as `copy-button` keep their own.

### Fixed

- **Installing `swipe-carousel` no longer breaks `reviews-carousel` and
  `invite-carousel`.** All three ship a `carousel-controls.tsx`, but
  `swipe-carousel`'s was a shorter copy without the rotation control. Files
  install flat, so adding `swipe-carousel` after either of the others replaced
  the file they import from, and the project stopped type-checking. All three
  now ship the same file, and a registry test fails if two items ever ship
  different files to the same path. If it happened to you, run
  `dowel update swipe-carousel`.
- **`sheet` and `drawer` no longer dim themselves.** Each put its overlay on
  `--z-overlay` (300) and its panel on `--z-drawer` (200), so the overlay
  painted over the open panel — and over `sidebar`'s mobile panel, which is a
  sheet. The overlay now shares the panel's drawer layer and comes first in
  the portal, so the panel sits above it; a dialog opened from inside a panel
  still dims it from the layer above. If you installed either, run
  `dowel update sheet drawer`, or change `z-[var(--z-overlay)]` to
  `z-[var(--z-drawer)]` on the overlay yourself.

## 0.11.0

Seven components from the "later" list in `docs/plans/agent-operable-ui.md`,
WebMCP's `exposedTo`, and fixes that make every registry item install and
build. The plan is `docs/plans/next-components.md`. All seven are `beta`.

### Added

- **`provenance-text`** shows who wrote each part of a paragraph: the person,
  an agent or a quoted source, with each author's share. Provenance is hidden
  until someone turns it on; when shown, agent and source text differ by
  underline shape as well as colour, and screen readers hear who wrote each
  marked part. `provenanceFromEdit` keeps attribution current word by word.
- **`nl-filter`**: type what you want to see ("failed on main took over 5"),
  press Enter, and get filter chips you can edit or remove. A plain parser
  ships for `field:value`, `field>3`, quoted values and option names; pass
  your own, such as a model call, and a newer submission aborts the older
  one. Text it cannot read stays in the field as "Not understood: …".
- **`memory-inspector`** shows what an assistant remembers about the person,
  where each memory came from and when it was last used, with search, edit
  in place, pin and forget. A forgotten memory disappears at once, and
  `onForget` is only called when the undo window closes.
- **`expression-editor`**, a formula field with highlighting, autocomplete
  for variables and functions, the error shown where it is, and a live
  result. It parses and evaluates the expression itself, from an allowlist,
  without `eval`.
- **`quantity-input`**, a number with a unit (kg/lb, GB/TB, s/min, °C/°F).
  Changing the unit converts the amount, min and max are quantities so they
  hold in any unit, "5 lb" typed or pasted sets both parts, and numbers are
  read and written the locale's way.
- **`permission-prompt`** asks for a capability when it is needed ("Claude
  wants to read your calendar"): why, what it allows and doesn't, and the
  risk in words, with allow once, for this session, always, or not at all.
  `usePermissionPrompt` gives an app or agent tool a promise to await, and
  remembers session and stored grants.
- **`chart-sonifier`** lets you hear a chart. Each series plays as pitch over
  time, and a keyboard slider steps through the points, playing each note and
  reading the value, beside a one-sentence summary of the series. Nothing
  plays until someone asks, and Pause, Escape and Mute stop it at once.
- **`agent-surface`: `exposedTo` and `debugging`,** from the WebMCP draft of
  2026-09-26. `exposedTo` lists origins, beyond the page's own, that may see
  the tools within the page's frames, on the surface or per tool. The browser
  refuses a whole tool over one bad origin, so the page drops those first
  and says which in development.

### Fixed

- **`expression-editor` builds in apps that target ES2017,** as a new Next.js
  app does. It used the regular expression flag `s`, which TypeScript refuses
  below ES2018. `packages/ui` now also type-checks at ES2017. Found by
  installing every registry item into a fresh app, which all 220 components
  and 47 blocks now pass.
- **Components installed with the CLI now build.** In this repo
  `@/components/x` resolves to a folder's `index.ts`, but an installed project
  has no index: the CLI rewrites the import to `@/components/ui/x`, the main
  file. 22 main files exported less than their index, so a project that
  installed one of them failed to build:
  - Every dither chart and `uptime-matrix` imported `createSprings`,
    `ditherFill` and more from `dither-canvas`, which `dither-canvas.tsx` did
    not export.
  - `agent-form` and `agent-approvals` imported the `JsonSchema` type from
    `agent-surface`.
  - `toast()`, `parseCron`, `FloatingLabelInput`, `findSensitive` and other
    documented exports could not be imported from their component's file.

  Each main file now re-exports what its index does, and the new
  `audit:installed-imports` fails CI when one doesn't. Found by installing
  0.10.0 into a fresh Next.js app.
- `stream-announcer`: NVDA with Chrome no longer re-reads the previous two
  sentences with every announcement after the third. The live region used to
  drop its oldest sentence while adding the newest, and Chrome then reported
  every sentence in it as new. It now fills up to three and then starts over.
  Found by the first real NVDA run.

## 0.10.0

### Agent-operable UI: agents can operate your UI and hand it back

Eleven components that let an agent work on the page itself, and let the
person oversee it and take the page back. The plan is in
`docs/plans/agent-operable-ui.md` and the decisions are in ADR 0015.

**Control**

- **`agent-surface`** (experimental) is a region whose actions are registered
  as tools with `useAgentTool`. Each tool runs the same handler a person's
  click runs, and its input is validated in the page. Your own assistant calls
  tools through `apiRef`; with `webmcp`, browser agents can call them too,
  through `document.modelContext` (Chrome and Edge origin trials). Control is
  state: `shared`, `agent` or `person`.
  - While the person holds control, every call is refused, reads included.
  - Irreversible actions need approval; without it they are refused.
  - Operating a control while the agent drives takes over, except inside
    `[data-agent-ui]`.
  - Other libraries already expose component actions over WebMCP. This one is
    built around who has control.
- **`control-baton`** (experimental) shows who has control and lets the person
  take over, then hand back with a note. The note is added to the start of the
  agent's next tool result. It works inside a surface, or on its own with
  `holder`. We don't know of another component library that ships a reusable
  take-over / hand-back control; the pattern comes from agent products such as
  ChatGPT agent and Browserbase's live view.

**Oversight**

- **`agent-approvals`** (experimental) is the approval step, built on
  `ai-approval-request`. The person can correct the agent's arguments before
  approving, approve once or for the session, or deny with a reason the agent
  is told. Mounting it inside a surface is all the wiring there is, and
  requests still waiting when it unmounts are refused.
- **`agent-ledger`** (experimental) lists what the agent did, built on
  `ai-action-ledger`. It can undo a call whose tool registered an undo with the
  new `onUndo`, and the agent is told what the person took back.

- **`blast-radius`** (beta) shows what an action will change before it runs:
  how many things, how, which can't be undone, and a sample by name. For
  example: "43 deals will change: at least 3 deleted. At least 2 cannot be
  undone." A tool's new `preview` dry run fills it in inside `agent-approvals`
  while the person decides.
- **`agent-replay`** (experimental) steps through a finished run, by button,
  slider or playback. It shows each call, exactly what the agent was told,
  and every take-over and hand-back.
- **`ai-suggest-mode`** (beta) is track changes for an agent's edits to text.
  Each change is shown in place with its reason and accepted or rejected on
  its own. It works from edits or from a whole rewrite. The agent is told what
  was rejected, so it doesn't suggest it again.

**Privacy**

- **`prompt-redactor`** (beta) checks a prompt before it's sent. Email
  addresses, card numbers, IBANs, API keys and phone numbers are named, masked,
  and sent as placeholders such as `[EMAIL_1]`. They're put back locally in
  the reply. Card numbers and IBANs are only matched when their checksums
  pass, and you can add your own detectors.

**Tools for existing components**

- **`agent-form`** (experimental) gives fill, read and submit tools to any
  form. Fields, labels, options and errors are read from the form itself.
  Values are set through the events typing fires, and submitting goes through
  the form's own handler. Passwords, one-time codes and card numbers are never
  read or filled. Submitting waits for approval unless you say it can be
  undone. With `declarative`, the form also describes itself to browser agents
  through WebMCP's form attributes, and their submits pass the same checks.
- **`agent-data-table`** (experimental) provides `useDataTableAgentTools`,
  which gives a TanStack table read, sort, search, filter, select and page
  tools, each only when the table has that feature. They call the same API as
  the table's own controls.

**Accessibility**

- **`stream-announcer`** (beta) is an opt-in way for a screen reader user to
  hear a streaming response as it arrives. It reads whole sentences only,
  pacing them so pause, skip and repeat can still act on the queue. Markdown is
  read as prose, and a code block is summarised as its language and line count.
  `ai-conversation`'s state-only announcements stay the default.
- **Screen reader tests.** `packages/screen-reader-tests` drives real
  VoiceOver and NVDA through Guidepup, in a new CI workflow. A harness project
  checks the scenarios themselves without a screen reader, and JAWS has a
  manual protocol in `docs/testing/screen-readers.md`. `stream-announcer` stays
  beta until those runs pass.

**Changes to existing components**

- `agent-surface` also gains `preview`, `told`, a `controlLog` of changes of
  control, and `api.notify`, which tells the agent something with its next
  result.
- `ai-approval-request` and `ai-prompt-input` now carry `data-agent-ui`, so
  approving a call or typing to the agent inside a surface never counts as
  taking over.
- `ai-action-ledger` no longer keeps a reverted action in its selection, where
  it was still counted by "Undo 2 selected".

## 0.9.0

### Interaction patterns: 18 components, and motion for 6 more

Every pattern on Rare UI's components page is now reachable in Dowel, plus five
the library was missing. Rare UI's licence (MIT with the Commons Clause) forbids
redistributing its components or ports of them, so none of its code was read or
used: each item is an original implementation written from the published
behaviour descriptions, marked _original_ in its header and listed in
`THIRD_PARTY_NOTICES.md`.

- **AI** — `matrix-orb` (a dot-matrix orb for idle, listening and thinking),
  `fluid-orb` (a WebGL orb with its own shader and a CSS fallback) and
  `grid-reveal` (a generating-image frame that splits into cells and resolves,
  busiest detail first).
- **Navigation** — `rail-nav` (a vertical nav with a bouncing dot or a hooked
  rail: Rare UI's Bounce and Hook sidebars as one component with an
  `indicator` axis), `minimap-nav` (a proximity-scaled document minimap),
  `scroll-progress` and `gooey-nav`.
- **Form** — `duration-picker`, plus `rating`, `hold-button` and
  `theme-toggle`, which are new.
- **Display, feedback, effects** — `folder`, `step-player`, `gravity-field`
  (its own tested physics), `emoji-reaction`, `notification-bell`, plus
  `like-button` and `countdown`, which are new.
- **Existing components gained Rare UI's behaviours without API changes** —
  `code-block` (an `accent` theme, line numbers, highlighted lines, a springing
  copy check), `otp-input` (`status` success and error feedback, a single
  sliding caret, a `roll` entrance), `number-flow` (faded reel edges, spinning
  through rapid updates, animated width, `prefix`/`suffix`),
  `contribution-graph` (`ContributionGraphPanel`, `months`, `accent`),
  `animated-checklist` (`sortDone`, `size`) and `inline-confirm`
  (`variant="icon"`, a bin whose lid lifts).

## 0.8.0

### The motion catalogue: 109 components, 34 blocks, and motion for 32 more

Everything on SmoothUI, bencho and amicro's buttons, cards, carousels, loaders
and dither-charts pages, brought into Dowel — 75 components became 184, and 17
blocks became 51. The plan and every decision are in
`docs/plans/component-expansion.md` and ADR 0014.

Four hundred source items did not become four hundred components. Where a
source ships the same mechanism with different parameters, Dowel ships it once
with a variant axis: amicro's 128 loaders are six loader families, its 25 icon
morphs are one `morph-button`, SmoothUI's 19 text entrances are one
`text-effect`. Where a source item duplicates something Dowel already had —
tabs, checkbox, pagination, dialog, menus, the AI set — its motion went into
the existing component without changing its API; every existing test passes
unchanged.

- **Loaders** — dots, ring, bar, shape, text and grid, every amicro variant and
  SmoothUI's grid and AI loaders. They slow under reduced motion rather than
  freezing, like the spinner.
- **Buttons and text** — morph, effect, copy, magnetic and dot-morph buttons;
  text effects, swaps, shimmer, scramble, typewriter, scroll reveal and
  rolling numbers.
- **Cards and carousels** — card spreads, 3D, swipe, review and invite
  carousels, stacks, marquee, glow and tilt cards.
- **Charts** — a dither canvas engine and ten charts on it, each a labelled
  image with a data table and keyboard twins for every hover.
- **Interactions** — every bencho block, parked ones included, as components: reorder lists with
  grab-move-drop keyboard support, sliders, dials, docks, menus, toggles.
- **The rest of SmoothUI** — overlays including Dowel's first `context-menu`,
  OTP input, stepper, orbs, AI suggestions, branches and artifacts, WebGL
  shader transitions, and every marketing section as a block.

Keyframes ship with each component through a hoisted stylesheet instead of the
theme, so installing one never needs a theme migration. `motion` is a new
per-component dependency, used only for gesture springs, shared layout and
pointer physics; most of the catalogue is CSS.

Two existing bugs were fixed along the way: `ai-conversation` scrolled smoothly
under reduced motion, and `ai-approval-request` dropped focus after a decision.
Button press feedback is now on by default (`press="none"` turns it off).

All three sources are MIT; `THIRD_PARTY_NOTICES.md` carries their notices.
bencho's four paid blocks and thirteen Codrops-derived SmoothUI shaders were not
ported: those are original designs, written without reading the source.

### Six theme presets from SmoothUI

`candy`, `indigo`, `blue`, `red`, `orange` and `green` join the theme layer,
derived from SmoothUI's six themes. Each maps SmoothUI's brand to `--primary`
and its deeper brand-secondary — the far end of its gradients — to
`--primary-active`. Dark mode uses SmoothUI's colours as they are; light mode
cannot, because none of the six carries white text or reads as text on white at
4.5:1, so each is darkened to the lightest value that does, keeping its hue.
Each file says what changed and by how much. The contrast audit now reads its
preset list from `THEME_PRESETS` instead of its own copy: 598 pairs across 26
schemes, all passing.

### The paid blocks were readable from the documentation site

Every Pro block's compiled source was downloadable from the docs site, without
a licence and without a request to the gated route. The previews are one
generated module of static imports read by a client component, so the bundler
put all four licensed blocks in a single chunk — and that chunk loaded on the
pages of free components too. Reading about `button` downloaded the CRM.

ADR 0013 had accepted a version of this: the compiled component in a bundle is
not the source file that is sold. What it did not account for is that the
bundle was not scoped to the block being viewed, and that "not the source file"
is thin comfort when the whole implementation is one `curl` away.

Licensed blocks are now excluded from the client preview map entirely and
rendered to markup at build time by `apps/docs/scripts/prerender.ts` — the same
stories the tests run, delivered as a still: `inert`, labelled, ids namespaced
so they cannot collide with the page's. The block's page still shows every
story and the switcher still works. `prepare.ts` fails the build if a licensed
name reappears in the client map, because nothing else would notice: the site
looks correct either way.

### Licensing: the right endpoint, and a way to check it

Setting Polar up for real found two bugs in the adapter that shipped in 0.7.0,
both of which would only have surfaced as a customer's failed install.

- **It called the wrong endpoint.** `/v1/customer-portal/license-keys/validate`
  takes no authentication, because it exists for desktop and mobile clients
  that cannot hold a secret, and it is rate-limited to a few requests a second
  for that reason. Validation from a server belongs at
  `/v1/license-keys/validate`, authenticated with an organisation token, which
  is what it now uses.
- **`organization_id` is required** by that endpoint, and the config treated it
  as optional. A deployment with a token and no organisation id would have
  failed every check with a malformed-request error, reported to the customer
  as a problem with their key. Both variables are now required together, and a
  half-configured deployment reads as unconfigured — which is at least true.

A third change is about who gets blamed. A 401 or 403 from Polar is about
*our* credentials — a token missing the `license_keys` scopes, or rotated —
and the adapter previously answered "that licence key was not recognised",
sending a paying customer to support over our misconfiguration. Those now fail
as a provider error, so the CLI reports a service problem. Only a 404 is
treated as a bad key.

`GET /r/license/health` reports which provider is active and whether keys can
be validated, naming the licensed items and never a credential — not even a
masked one, since confirming which token is in use is what an attacker wants.
Configuring a paywall otherwise has no feedback short of buying a licence.

## 0.7.0

The release that puts something up for sale, and fixes the bug that finding
out how to sell it uncovered.

Nothing that was free has stopped being free. The registry build now has a
test that names every block which shipped without a licence and fails the
release if any of them changes access; the components and the two `init`
items are covered by the same test.

### The Pro catalogue

Four blocks, all new, all `access: "pro"`. They are whole application surfaces
rather than page sections, and each one found something:

- **crm** — a pipeline with its deals. Open value by stage as one bar with the
  figures listed beside it, a filterable, sortable deal table, the win rate and
  the sales cycle — the last declared lower-is-better, so a slowing pipeline is
  not painted green.
- **command-center** — service health worst-first, incidents by severity with
  the resolved ones after, capacity meters, a filterable log stream, and a ⌘K
  palette of operator actions. The overall status is one sentence computed from
  the worst service, and it is not a live region: a page refreshed by polling
  that re-announces itself on every poll is a page nobody can work beside.
- **ai-workspace** — conversations down one side, the transcript in the middle
  with reasoning, tool calls and sources, and the model's context on the other:
  window usage, attachments, a structured result filling in. Three named
  landmarks, so each can be jumped to and skipped.
- **admin-dashboard** — the shell an admin area shares (navigation, breadcrumb,
  account menu) with `children` for your own pages, and an overview that puts
  what needs attention first and keeps it the only loud part of the page.

What makes them Pro is where the source lives. The registry lists them —
title, description, what they are built from, file count — and serves their
bodies only to a licence holder; the docs site renders their previews from the
same stories the tests run and withholds the code; the MCP server describes
them from the index and says how to get the rest instead of reporting a 404.
`packages/ui` no longer ships `src/blocks` in its npm tarball, for every block:
blocks were never importable from the package (ADR 0011), and a licensed
block's source in a public tarball would have been the paywall gone.

The quality page measures Pro blocks against the same rules as free ones, and
the counts audit reads the index rather than the directory, since a licensed
item is listed but not written.

### Sidebar: the overlay is mounted only on a narrow screen

Composing the AI workspace found it. The mobile sheet was mounted whenever the
rail was open and hidden with `md:hidden`, and a modal dialog that CSS hides is
still modal: on every desktop, whenever the sidebar was open — its default —
the rest of the page was `aria-hidden`, focus was trapped in an element nothing
could reach, and `pointer-events` was off on the body. The live docs had it.

The sheet now mounts only below the breakpoint, watched with `matchMedia`, and
has its own open state, closed to begin with: "expanded by default" is a fact
about the rail, and an overlay that covers the page on first load is a menu
nobody asked for. Labels inside the overlay are always visible, whatever the
rail's collapsed state. The trigger says "Open navigation" or "Close
navigation" there, and drops its `aria-controls`, which pointed at an element
CSS had hidden.

### The site

- **Pricing.** Free, Pro and Teams & Enterprise, with the free tier's promise
  stated before anything else. The Pro button goes to the checkout when
  `PRO_CHECKOUT_URL` is set and says "opening soon" with the repository to watch
  when it is not — a pricing page with a dead Buy button is a page that tells
  everyone the product is not real. Teams is described as it is: a self-hosted
  private registry today, free, with the hosted version and SSO named as
  planned rather than sold.
- **Private registries** — a guide to building and hosting one with
  `@dowel-ui/registry`, which the README had and the site did not.
- **By the numbers** on the front page: components, blocks, AI components and
  the average quality score from the registry and the audits, plus npm
  downloads and GitHub stars fetched at build and refreshed hourly. A figure
  that cannot be fetched is left out, never shown as zero. The version badge on
  the front page, which had said 0.1.0 since there was a front page, now reads
  the package version.
- Blocks and Pricing in the header; the two guides in the docs navigation; a
  footer with somewhere to go.

### Design tokens for Figma

`@dowel-ui/themes` gains `parseTokenCss`, `resolveReferences`, `toDesignTokens`
and friends: they read the same `tokens.css`, `base.css` and preset files the
components use, resolve every `var()` the way the cascade would, and write a
W3C design-tokens document — `core`, `light` and `dark` sets, colours as sRGB
hex converted with the same maths the contrast audit uses. The docs site
serves one file per shipped preset at `/figma/<preset>.tokens.json`, and the
Theme Studio downloads the same file for a preset built there, with the
radius ladder evaluated at the scale set on the page.

## 0.6.0

The largest release so far, and the one that turns a component library into
something you can build a product on: an agent surface, a playground, a theme
studio, per-component quality, five blocks, a scaffolder, licensing, private
registries and a grounded generator — plus two new published packages.

Everything here is additive. Nothing that was installable without a licence has
stopped being one, and no component's API changed.

### New packages

- **`@dowel-ui/mcp`** — a Model Context Protocol server over the registry.
  `search_components`, `get_component` (source on request), `get_guide`,
  `install_command` and `plan_ui`. An agent that has never heard of this library
  writes its own Button — a second one, with a different focus ring and
  hardcoded colours — and the hole it leaves is not noticed until someone tabs
  into it. A mistyped name is answered with the nearest real one rather than
  silence.

- **`create-dowel-app`** — `npx create-dowel-app my-app` asks what you are
  building and which theme, writes a Next.js app, and fetches the components.
  Three templates: `starter`, `saas` and `ai`.

  The templates carry application files and a list of registry names, not the
  components. The scaffolder runs the same CLI a user would, so a project created
  today is built from today's registry rather than from whatever was current when
  the template was written — and a template stays a dozen files instead of a
  hundred. The whole package publishes at 19 kB.

### New components

- **textarea** — twenty-two form components and no multi-line field; the only
  textarea in the library was buried inside `ai-prompt-input`. Sizes, optional
  auto-resize, and vertical-only resizing by default, because the browser default
  is `both` and a field dragged wider than its container is a layout broken by a
  control meant only to be made taller.

  The character count is the part worth explaining. Wired as a live region it
  announces on every keystroke, so a screen reader reads "one hundred and
  forty-one characters remaining" between every letter. Here it is silent while
  there is room and goes live only once the limit is close, which is the point at
  which it is information rather than chatter. It states the remainder in words
  rather than as `141/200`, which is read aloud as two unlabelled numbers, and
  says how far *over* rather than showing a negative.

- **sidebar** — the application's own navigation, and the reason it exists is
  that `create-dowel-app`'s app shell had been hand-rolling one. Two states, not
  one: on a wide screen it collapses to a rail and stays in the page; on a narrow
  one it is an overlay, which needs a focus trap and an Escape key and is
  therefore a Sheet rather than a div with a transform. Build one behaviour and
  hide it at a breakpoint and the page behind stays reachable by Tab while the
  menu covers it.

  The collapsed rail is where these usually fail. Hiding the label leaves a
  control whose only content is an icon, and an icon has no accessible name, so a
  collapsed sidebar becomes a column of links all announced as "link". Labels are
  visually hidden, not removed.

- **breadcrumb** — the current page is a span carrying `aria-current="page"`, not
  a link: a link to the page you are already on does nothing, and in a screen
  reader's list of links it is indistinguishable from the ones that go somewhere.
  Separators are hidden, because "Home slash Projects slash Settings" is the
  design's punctuation leaking into the content. The ellipsis is the exception
  and is named — unlike a separator it is content, saying levels have been left
  out.

- **collapsible** — one region, one trigger, no set semantics. An Accordion of a
  single item gives that item a heading role and a position in a list of one,
  neither of which is true.

- **direction** — tells the primitives which way the writing runs. See
  *Right to left* below.

### New blocks

Eight to thirteen.

- **billing** — plan, metered usage, payment method and invoice history. Every
  usage meter states where it stands in words — "8 of 10 seats used, 2 left", or
  how far over — and the bar is hidden from the accessibility tree so the same
  fact is not announced twice. Each invoice download is named after its invoice
  rather than being one of ten identical "Download" links, which is all a links
  list would show. A card's last four digits are spoken as digits, not as a
  four-figure number.

- **analytics** — the bars are declared as one image with a one-sentence summary
  of the shape, rather than forty separately labelled elements, which reads as
  noise instead of a shape. The exact numbers are a real table, collapsed for
  everyone and revealed for everyone from a control on the page, rather than a
  visually hidden copy only screen readers can reach — the hidden copy is the one
  that goes stale. The range selector is a select, not a tab set: tabs promise
  panels, and a range selector has none.

- **onboarding** — every step states its state in a word, because a green tick
  announces nothing and means nothing to a reader who cannot tell the colours
  apart. Blocked is a distinct state from not-started and says why.

- **ai-dashboard** — what the AI features cost and whether they worked. Spend and
  failure rate are declared lower-is-better, so a rising bill is not painted
  green, which is the mistake most usage dashboards make. The totals row is a
  real table footer rather than a last body row that looks like one.

- **agent-console** — one run, watched: the plan it is working from, the approval
  it is blocked on, and the ledger of what it has already done. Whatever is
  blocking the run renders first, because it is the only part of the page waiting
  on a person.

### Coding agents

`dowel agents` writes documentation for the agents working in a project — a
`.dowel/` reference set, a marked block in `AGENTS.md`, a Claude Code skill and a
Cursor rule — generated from the registry the project installs from and marking
what is already installed. `--check` reports staleness and exits non-zero for CI,
because a catalogue a release behind is worse than none: the agent trusts it.

The site serves `/llms.txt` and `/llms-full.txt`, generated at build time. One
generator feeds the CLI, the MCP server and the site, so they cannot disagree.

### Playground, Theme Studio, Quality and Generate

Four new surfaces on the site, each generated from something rather than written
alongside it.

- **Playground** — every control is derived: variant axes are read from each
  component's own `cva()` call through the TypeScript AST, the rest from the
  `argTypes` its stories already declare. A control cannot offer a value the
  component does not implement.

- **Theme Studio** — build a preset from one colour and see whether it passes
  WCAG AA before shipping it. The check is not a second implementation: `oklch`
  to sRGB and the WCAG ratio now live in `@dowel-ui/themes` and are re-exported
  to the audit that gates CI, so a colour the studio passes is one the build
  passes. The export is the same file format as `presets/*.css`.

- **Quality** — every component and block measured against the rules `audit:api`
  and `audit:tokens` already enforce, read from its own source and test file.
  Checks that do not apply are recorded as such and left out of the score, so the
  denominator means something. Currently 99% across 88 items, with 78 perfect and
  ten carrying one gap each — every one an interactive component tested by click
  but never by keyboard. The page exists to show that rather than round it away.

- **Generate** — describe a screen and get the components that build it, the
  install command, and a brief to paste into a coding agent. Resolved against the
  registry first, so it cannot name a component that is not installable — which is
  what asking a model directly gets you, complete with a `variant` nobody
  implemented. It does not guess at props: the registry publishes what a component
  is, not the shape of its arguments, and a plausible invented prop is worse than
  an obvious gap.

### Licensing

Entitlement metadata, CLI authentication and a gated registry path.

**No existing component is licensed, and none becomes licensed by this release.**
`access` defaults to `free`, a registry written before this parses as `free`, and
free is a promise: an item that has ever been installable without a licence must
not quietly stop being one.

The index lists everything including licensed items — that is the catalogue, and
an item nobody can see is an item nobody buys. What the public directory does not
contain is a licensed item's *body*: those never reach the directory a CDN serves,
because a paywall that can be stepped around by fetching the JSON is not a
paywall.

`login`, `logout` and `whoami`. The key is verified against the registry before it
is stored, so a bad key fails when it is pasted rather than days later during an
install. It is stored in the user's config directory at mode 0600 — never in the
project, because a key in `components.json` is a key in git — and `DOWEL_TOKEN`
overrides it for CI.

`POST /r/license` and `GET /r/pro/<name>` on the site. The licence is checked
*before* the name is looked up, so the paid catalogue cannot be enumerated by
probing 404s, and every response is `no-store, private`.

**It fails closed.** With no provider configured the registry refuses everything
and says why. Allowing by default would give the product away the first time a
deployment was misconfigured, silently, and for as long as nobody noticed. See
`RELEASING.md` for the environment it reads; there are no credentials in this
repository.

### Your own registry

`@dowel-ui/registry` can now build one, not only be read from. `extends` layers
your components on top of another registry, so one URL serves both and `add`
resolves across them. A local item replaces an upstream one of the same name and
the build reports which — overriding upstream's Button is a legitimate thing to
want and a catastrophic thing to do by accident.

Three things are refused at build time rather than left to fail in a consumer's
repository: a file an item names but that does not exist; an import written
against the *installed* path (`@/components/ui/badge`) instead of the authored one
(`@/components/badge`), which rewrites to a doubled segment resolving nowhere; and
a component importing a registry item it never declared.

### Right to left

The component set inverted wrongly in Arabic, Hebrew, Persian and Urdu — the icon
on the wrong side of the label, the indent running the wrong way — across 96
physical properties in 32 files. Nothing about it looked broken in English, which
is why it survived review, and the library audits 322 contrast pairs across every
preset while shipping a set that could not be read right-to-left.

All of them are logical now, and `pnpm audit:rtl` fails the build on any physical
property that has a logical form, and on any icon that points along the reading
direction without being mirrored. Logical CSS mirrors the box an icon sits in and
not the glyph inside it, so a page could invert perfectly and still have a "next"
chevron pointing back the way you came.

An RTL application needs two things: `dir` on the document, which the styling
follows, and the new **`DirectionProvider`** around the tree. The primitives read
direction from React context and assume left-to-right without it, which mirrors a
page everywhere except its menus, selects and sliders — worse than not mirroring
at all, because it looks deliberate.

Two things stay physical on purpose. `Sheet`'s `side="left"` and a toast's
`position="bottom-right"` are named after a side, and a control asked for on the
left that appears on the right is an API telling a lie. The logical versions are
`start`/`end` props, which would be a rename rather than a restyle.

This is not a claim that the components have been reviewed by a reader of a
right-to-left language. The audit checks that nothing is styled or drawn against
the direction, which is necessary and not sufficient.

### Fixed

- **Avatar, Badge and Card were absent from the documentation site**, from the
  components index and the sidebar both, with nothing reporting it.
  `CATEGORY_ORDER` did not name the `display` category and the grouping filtered
  to that list. Categories the curated order does not name are appended now
  rather than dropped.

- **Stories were ordered alphabetically rather than as written.** A module
  namespace object sorts its own keys, so `Object.keys` never returned source
  order and Button's page opened on "As Link". The order is recorded at build
  time, because it cannot be recovered at runtime.

- **34 stories were invisible**, including the `Default` example on 25 component
  pages. `asStory` required a `render` or `args`, which the canonical
  `export const Default: Story = {}` has neither of.

- **`add` did not install missing npm packages when the component files were
  already current.** They were computed after the "already up to date" early
  return, so anything added with `--skip-install` had its source in place and its
  dependencies absent, and the components could not resolve.

- **`audit:package` read a hardcoded list of packages**, so a new one was never
  audited and nothing said so. It discovers the workspace now.

### Requires

Node ≥ 20 and pnpm 11 for development, unchanged. `@dowel-ui/mcp` and
`create-dowel-app` both require Node ≥ 20 at runtime.

## 0.5.1

`@dowel-ui/cli` only. The other packages are unaffected and stay at 0.5.0, and
the registry the site serves is unchanged, so nothing needs redeploying.

### Fixed

- **`init` could not read a path alias from any Next.js project**, and had not
  been able to since the first release. The tsconfig comment stripper was a
  regex: the alias `"@/*"` contains `/*`, which it read as opening a block
  comment, and the first `*/` it then found was inside `"**/*.ts"` in the
  `include` array. Everything between went, `paths` with it, so the JSON no
  longer parsed and the failure was swallowed by the surrounding catch.

  Every stock Next.js tsconfig has both halves. Under `--yes` init refused
  outright while pointing at the block it had just deleted; interactively it
  asked for an alias it could already see, which is why four releases went by
  without anyone noticing. Comments are now stripped by a scanner that knows
  what a string is.

  `project.ts` had no tests, which is the real reason this shipped. It has 15
  now. Found by running the post-publish install test this file's sibling
  documents, against the published 0.5.0.

## 0.5.0

### New components

- **ai-extraction-review** — the check after extraction: the document on one
  side, what the model read out of it on the other, and a decision about every
  field. Invoice capture, KYC onboarding and claims intake all have this screen,
  each built from scratch, because a value that cannot be checked can only be
  trusted. Every extraction demo shows the filled object and stops; no component
  library ships the step after it.

  The link is the component. Each field carries where in the source it was read
  from — highlighted in the document as a `mark`, and quoted in text under the
  value, so a reviewer who cannot see the highlight still has the evidence and a
  sighted one has the comparison in view: "1 March 2026" beside "2026-03-01" is
  a normalisation, not an error, and only reads that way with both present. A
  value with no evidence is said outright, "the model supplied this without
  evidence", because that is the case the review exists to catch and the one a
  filled-object view renders identically to a good value. The running count
  says how many such fields there are before the reviewer starts.

  Evidence is a text offset, not a bounding box. A language model reads text and
  a text layer with offsets is what every OCR pipeline already yields; boxes
  over a rendered page need page rendering, zoom and geometry, and are a
  different component. Offsets from a model are wrong often enough that
  refusing to render on a bad one would blank the whole review, so a span past
  the end is clamped and an inverted one counts as no evidence, which is what it
  is. Overlapping spans — a total inside the line that contains it — cut into
  nested runs rather than two marks fighting over the same characters.

  Decisions are controlled and the component writes nothing. What comes back is
  richer than a form's values: accepted as proposed, corrected from what was
  proposed with the model's value kept beside the reviewer's, or rejected. An
  accepted value that is edited afterwards says "changed since it was accepted"
  and releases the button, because a record that silently kept the old decision
  would be a guess. Nothing is spliced into the source text for assistive
  technology — a document read aloud with field names inserted is not the
  document — and focus anywhere in a field brings its evidence into view without
  moving focus, so a keyboard user is shown the source rather than sent into it.
  Enter accepts, except while an IME is composing, for the same reason the
  prompt input checks.

  The model is pure and separately importable: `summarizeReview` answers "is
  this review finished" on the server from the decisions the client sent, rather
  than from a flag it sent alongside them.

- **ai-suggested-value** — an AI-proposed value for any form control, offered
  beside it rather than written into it. Autofill is the most common shape AI
  takes inside ordinary software — enrich this contact, fill this form from the
  upload — and nearly every implementation writes the value into the field as
  if the person had typed it. A plausible, wrong value then rides through on
  their own Submit, and once submitted the record cannot tell a value the model
  supplied from one a human typed, which is the fact an audit later needs.

  So the suggestion stays pending until accepted, and acceptance is reported
  rather than performed: the component hands the value to `onAccept` and never
  touches the control. That is what lets it wrap a select, a date or a number
  where ghost text can only complete a string — `ai-inline-completion` does
  text, this does the rest. Afterwards the field says it was filled by AI,
  says if it was edited since, and Undo puts back what was there. Inside a
  `FormControl` the id and ARIA it passes down are forwarded to the control,
  and an existing `aria-describedby` is merged rather than replaced.

  The suggestion is the control's description, so a reader who lands on the
  field hears it. Announcing on arrival is opt-in, because a form filling
  twenty fields at once would narrate all twenty; when it is on, the row is
  already in the accessibility tree, since a live region that appears at the
  same moment as its content announces nothing.

  Deliberately no "accept all". A button that takes every suggestion at once is
  the review deleting itself.

- **cron-editor** — a schedule as a cron expression, with the sentence beside
  it that makes `0 9 * * 1` readable and the next five runs in a named zone.
  GitHub Actions, Vercel, Airflow, Sentry and every admin panel with a
  "run this nightly" setting draw this control by hand; the packages that
  exist are bound to Ant Design or ship their own stylesheet, the problem the
  diff viewer already solved once.

  The dialect is POSIX five-field cron — what crontab, GitHub Actions, Vercel,
  Kubernetes and Airflow read — with the `@daily` shortcuts. Not Quartz: no
  seconds field and no `L`, `W` or `#`, because an expression this editor
  produces has to run where it is pasted. The model is pure and separately
  importable, so `nextRuns` can compute the next run on the server from the
  same expression the editor produced.

  Two things every reimplementation gets wrong, both tested. When day of month
  and day of week are both restricted, cron fires when either matches, and the
  sentence says "or" because "and" is what readers assume. And a wall-clock
  time that does not exist on the day the clocks go forward is skipped rather
  than run at a made-up instant, while an ambiguous one in autumn runs once,
  at its first occurrence.

  Next runs are headed by the zone they are in, since a time with no zone is
  the classic scheduling mistake, and a schedule that never runs — the 30th of
  February — says so rather than showing an empty list. Days 29 to 31 say in
  text that shorter months skip them. An invalid expression says why and is
  not applied.

  Both files are within the per-file budget, but together the entry is the
  first past the audit's sprawl line, at 38 kB against 36. The line is a
  report rather than a gate and asks to be argued with: the model is half the
  entry and is the part worth owning, and the builder cannot lose a control
  without losing a frequency. Left as it is, and noted so nobody has to
  wonder whether it was seen.

- **secret-field** — an API key, token or signing secret in the three states
  it actually has: shown once at creation and never again; hidden but
  revealable, for a secret the server can show again; and gone, where a prefix
  and the last four remain and the only thing left to do is regenerate.
  Stripe, GitHub, OpenAI and Vercel each draw this by hand. The nearest thing
  any library ships is a password input, which is for entering a secret you
  know, not for handling one you have just been given.

  "Shown once" is a first-class state rather than a toast, because it is the
  one that costs people money: the key is on screen, the tab closes, and the
  next hour goes on regenerating it and updating every client. The field says
  it in a sentence beside the value, and the way out is a button that says
  what it means — "I have saved it" — rather than the value vanishing on
  navigation. While hidden, the secret is not in the DOM: the preview is what
  renders, so a screenshot or an extension sees what the server itself keeps.
  Reveals are reported, since an audit log of who looked is the reason the
  hidden state exists, and copy works while hidden because a key is for
  pasting, not reading.

  Copying is announced, and so is failure, with what to do instead. A missing
  clipboard API fails the same way as a refused one rather than throwing out
  of the click. Regenerating is confirmed inline with the consequence stated,
  because it revokes the current key.

- **confirm-typed** — type the name to confirm. The GitHub pattern for the
  action that cannot be undone, copied by every product and absent from every
  component library, and usually built wrong in the one place it matters:
  what happens when the text does not match. The common version disables the
  button and says nothing, so a keyboard or screen reader user presses it, or
  Enter, and nothing happens at all.

  Here a mismatch is said. The button stays reachable, dimmed rather than
  disabled, and pressing it or Enter before the text matches announces what
  was expected, marks the field invalid and returns focus to it. The match is
  announced once, on the transition, naming the action that became available.
  Typing itself stays silent, because a verdict on every keystroke is noise.
  Surrounding whitespace never decides it, since a reader cannot see it to
  know why they failed.

  Pasting is allowed, deliberately. Blocking it is a popular piece of friction
  that punishes exactly the people who cannot type a long name easily — switch
  users, voice users, anyone with a tremor — and stops nobody who can
  select-all and copy. The point is that the name passed through the reader's
  attention, not their keyboard.

- **permission-matrix** — roles across, permissions down, a checkbox at every
  crossing. Every admin panel has one and every admin panel builds it, because
  the hard part is not the checkboxes: a role inherits from another, so a box
  is ticked without anyone having ticked it; an Owner has everything and none
  of it can be unticked; a section of eight permissions wants one control; and
  sixty checkboxes are sixty tab stops unless something is done about it.

  Something is done about it. This is a grid in the WAI-ARIA sense — one tab
  stop, arrow keys between cells, Home and End along a row — which is the
  right call here and was the wrong one for the diff viewer: a diff is read,
  a matrix is operated. Every checkbox is named by both coordinates, so a
  reader arriving by arrow key knows where they are without re-reading the
  headers.

  An inherited grant is a checked box that cannot be unchecked here, with the
  role it came from beside it and in the box's description. A disabled control
  would be the obvious rendering, and it would take the box out of the tab
  order and the arrow-key path, so a keyboard user would step over the one
  cell whose state needs explaining. Changes are reported, never applied, and
  a group toggle reports every permission it touched in one call — only the
  ones that can change, since inherited grants stay either way — so an
  application saves one change rather than eight.

  The model is pure and exported: a server can answer "may this role do this"
  from the same grants the matrix edits, with the same rule for inheritance,
  which is resolved transitively and survives a cycle.

- **dns-record** — "add this record at your DNS provider". Vercel, Resend,
  Cloudflare, Postmark and every product that verifies a domain or routes its
  mail draws this card by hand, and they all learn the same three things the
  hard way.

  The parts are copied separately, because a provider's form has a Name
  field, a Type field and a Value field, and one button that copies the whole
  line copies something nobody can paste anywhere. The Name field is a trap:
  some providers want the host relative to the zone, some want the full name,
  and some take the relative form and append the zone themselves, so a full
  name pasted in becomes `_dmarc.acme.com.acme.com` and the check fails for a
  reason nobody can see. The host is shown both ways, with the sentence that
  says which to use, and `dnsHostForms` is exported so a backend that stores
  the full name and one that stores the relative host both render the same
  card.

  A failed check says what was found. "Not verified" sends people back to
  stare at a record that is correct and has not propagated; "found v=spf1
  -all" sends them to the typo. Nothing found is said as nothing found, with
  how long that can take, because it is not the same as wrong. The status is
  a live region so the answer to a check arrives where it was asked for, and
  copy results are announced separately so they never replace a check result
  mid-sentence.

- **sync-status** — "offline, 3 changes will save when you're back". Linear,
  Notion, Figma and Google Docs each built it, and nothing in a component
  library touches network state at all. It is small, and it is the difference
  between an app that loses work and one that says it is holding it.

  `navigator.onLine` is believed in one direction only. False is reliable;
  true means there is an interface, not that the server is reachable, so an
  application's own failed request is the real signal and outranks it. The
  hook is exported so the rest of an app shares the same reading, and the
  server render assumes online, since a page with no interface to report has
  no business saying offline.

  Announcements are for transitions, not states. Every save flips "Saving…"
  to "Saved", and a live region on that text narrates the whole session. So
  the visible text is not live; a separate region says something only when
  the situation changes — went offline with what will happen to the changes,
  came back with what is being saved, could not save — which is when a reader
  who is typing needs to be told. On by default for that reason, and it can
  be turned off.

- **session-expiry** — "your session ends in two minutes, stay signed in?"
  Every product with an idle timeout builds this, and WCAG 2.2.1 says what it
  has to do: warn before the time runs out and give at least twenty seconds
  to extend it with a simple action. Most implementations get the first half
  and fail the second in one of two ways: the warning can be dismissed
  without choosing, so a reader who closed it to see the page underneath is
  signed out with no further word; or the countdown is a live region, so a
  screen reader user hears a number every second for two minutes and cannot
  hear the question.

  So this is an alert dialog that cannot be waved away. Escape and the
  backdrop do nothing, because dismissing a session warning without choosing
  is choosing nothing, and focus opens on the safe choice rather than on
  "Sign out now". The countdown ticks on screen and is announced at four
  moments — when the warning opens, at one minute, thirty seconds and ten —
  and a threshold a slow tick skipped over is still said once. When time runs
  out, `onExpire` fires once and the dialog says so with a slot for whatever
  the application offers next; it signs nobody out, because the server did.

  The clock is read in an effect, never during render, so the server renders
  nothing rather than a countdown from the wrong instant. Supply `now` to
  drive it yourself, or in tests.

- **shortcut-recorder** — press the keys you want. Linear, Slack, VS Code,
  Figma and Superhuman each wrote one, and no component library ships the
  recorder, only the `kbd` that displays the result. The recorder is the
  hard part: a button that, when pressed, stops being a button and starts
  being a keyboard listener, and has to come back.

  Three things it does that a listener bolted onto an input does not. It
  reads letters from `code`, not `key`, so Option-K records as Option K and
  not as the ˚ the Mac produced. It stores `Mod`, not Command or Control, so
  a binding saved on one machine is right on the other — the decision every
  app makes and few make explicitly. And it refuses a bare printable key by
  saying why, because a shortcut that fires while someone types a sentence is
  the bug every app that allowed it later fixed.

  Tab and Escape are never recorded: Tab leaves, Escape cancels, and a
  recorder that captures both is a keyboard trap with a nice label. A chord
  another command already uses is said, with that command's name, and applied
  only if the person says to use it anyway. The model is pure and exported,
  so the same parser can validate a saved binding on the server.
### Fixed

- **secret-field's fixture is no longer a live-shaped Stripe key.** The story
  and the test used `sk_live_…` as sample data, and GitHub's push protection
  blocked the push on it — correctly, since that prefix belongs to a
  real-money credential and nothing about the string said otherwise. The
  replacement cannot be mistaken for one. The component's doc comment keeps
  the bare prefix, which is a prefix and not a key, and is the point being
  made there.

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
