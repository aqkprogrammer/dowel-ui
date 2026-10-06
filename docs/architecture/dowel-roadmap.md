# Dowel roadmap

- **Status:** Proposed
- **Date:** 2026-10-05
- **Baseline:** 0.12.0 — 244 components, 51 blocks (4 Pro), 15 ADRs

This is the plan for taking Dowel from a component library with unusually good
agent support to the system that helps people _and_ coding agents build,
validate and ship React interfaces. It starts from an audit of what exists,
because most of what a greenfield plan would propose is already here in some
form, and the expensive mistake would be to build it a second time beside the
first.

Every phase is incremental, keeps the repository buildable, and changes no
public API without a migration path. Nothing below is a commitment to a date.

## Where Dowel actually is

### Already shipped

| Capability              | Where                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source-first registry   | `meta.ts` per item, verified against real imports (ADR 3); content hashes; `r/index.json` + `r/<name>.json`                                                |
| CLI                     | `init`, `add`, `list`, `remove`, `update`, `agents`, `login`, `logout`, `whoami`                                                                           |
| Agent instruction files | `dowel agents` writes `.dowel/*.md`, an `AGENTS.md` block, `.claude/skills/dowel-ui/SKILL.md` and `.cursor/rules/dowel-ui.mdc`; `--check` fails when stale |
| MCP                     | `search_components`, `get_component`, `get_guide`, `install_command`, `plan_ui`                                                                            |
| Generation              | `/generate` and `plan_ui`: a deterministic planner resolved against the registry, honest about being one                                                   |
| AI components           | 41, including the agent-operable layer (ADR 15) that no other library has                                                                                  |
| Themes                  | Two-tier OKLCH tokens, 13 presets, `--radius-scale`, `--motion-scale`, DTCG/Figma export, a theme studio with live contrast                                |
| Audits (repo-internal)  | contrast (598 pairs), tokens, API, bundle, package, motion, RTL, counts, installed-imports — all gated in CI                                               |
| Accessibility testing   | axe on every component and block; VoiceOver and NVDA in CI for `stream-announcer`                                                                          |
| Private registries      | `buildCustomRegistry` with `extends`, override reporting, and import validation                                                                            |
| Commercial              | Pro tier via Polar licence keys, a gated route that fails closed, and a pricing page that sells only what exists                                           |
| Discovery               | ⌘K palette, category browser with live previews, `llms.txt` / `llms-full.txt`, sitemap, OG images                                                          |

### What the master brief asks for, mapped to reality

| Brief item                  | State       | Note                                                                                                                                 |
| --------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Component Genome            | **Partial** | `meta.ts` is already the single source of truth. It lacks usage guidance, composition and props — extend it, do not replace it       |
| `dowel doctor`              | Missing     | `update` already computes installed / modified / outdated per file; most of doctor is a new view of data the CLI has                 |
| `dowel audit` / drift       | **Partial** | The checks exist as `scripts/audit/*`, hard-wired to monorepo paths. Porting them to run against a consumer project is the work      |
| `dowel diff`                | Missing     | `update` reports state, never content                                                                                                |
| Visual regression           | Missing     | ADR 12 deferred it until the API settled; with 244 components it now has                                                             |
| Dowel Verified              | **Partial** | `/quality` already scores each component; the missing part is a written standard                                                     |
| DOWEL.md / Skills           | **Exists**  | Under the names `AGENTS.md` and `SKILL.md`, which agents already read. A new filename would be one more file nobody's tool looks for |
| MCP expansion               | Partial     | Tools are live; they are also untested and the package has no README                                                                 |
| AI components / patterns    | **Exists**  | 41 components; patterns are the blocks `ai-chat`, `agent-console`, `ai-dashboard`, `ai-workspace`                                    |
| Theme studio                | **Exists**  | At `/theme-studio`. Not renamed: the URL is linked from the README and npm                                                           |
| Density token               | Missing     | Mentioned in a comment in `tokens.css`, never implemented                                                                            |
| RTL                         | **Exists**  | `audit:rtl` enforces logical properties; `direction-provider` ships                                                                  |
| ⌘K search                   | **Exists**  | Substring only; no ranking or typo tolerance                                                                                         |
| AgentBench                  | **Partial** | Harness and ten tasks in `packages/agentbench`; no run published yet. Scope in Phase 5                                               |
| Cloud / enterprise registry | Missing     | Self-hosted private registry is complete; hosted is a demand question                                                                |
| Showcase / marketplace      | Missing     | Requires real submissions; there are none to show                                                                                    |

## Findings that come before any new feature

### 1. The Pro source is public

The four Pro blocks (`crm`, `command-center`, `ai-workspace`,
`admin-dashboard`) are tracked in git under `packages/ui/src/blocks/`, and the
repository is public and MIT-licensed at its root. The npm tarball, the
registry and the docs bundle all withhold them correctly (ADR 13); GitHub does
not. Anyone can read or copy the paid source, and whether its licence is MIT or
the Pro terms is ambiguous.

This is a business decision, not a code fix, and the options trade differently:

- **Move Pro source to a private repository** (or a private submodule) that the
  registry build reads when present. Stops future exposure; existing history
  still contains the files.
- **Add a licence file scoped to `packages/ui/src/blocks/{crm,…}`** stating the
  Pro terms. Removes the ambiguity without hiding anything; relies on the
  licence rather than access.
- **Accept it** and treat Pro as paying for convenience and support. Then the
  pricing page should say so.

### 2. The CLI trusts its registry with the filesystem

Verified in source:

- `resolveDestination` (`packages/cli/src/lib/paths.ts`) joins a
  registry-supplied path with no containment check. An item whose file path is
  `ui/../../../.bashrc` is written outside the project. `registryFileSchema.path`
  is only `min(1)`.
- `remove` deletes every path `components.json` lists under `installed`,
  unchecked. A cloned repository can name any file.
- Item names from `registryDependencies` become URL and file path segments
  unvalidated.
- The licence token is sent as a bearer header to whatever registry
  `components.json` names, over `http:` as readily as `https:`. A repository
  can point at a host it controls, mark an item Pro, and collect `DOWEL_TOKEN`
  from CI.
- npm specifiers from the registry go to the package manager unvalidated, so
  a `git+https:` or tarball URL would be installed.

These are the highest-priority work in this plan because the CLI's whole model
is "run our code generator against your repository", and a source-first library
is exactly as trustworthy as its installer.

### 3. One 2.16 MB chunk loads on 296 of 312 pages

`apps/docs/src/components/story-preview.tsx` imports
`previews.generated.ts` — 293 static story imports — so every component page,
block page and the playground downloads every story (≈600 kB gzipped). This is
the same failure ADR 13 fixed for the Pro previews, on the free side.

### 4. The hero keeps rendering when nobody can see it — checked, not changed

`FrameCoordinator.setActive` is documented as false while the tab is hidden but
is only set false on unmount, and the scheduler falls back to a 33 ms timer when
`requestAnimationFrame` stalls. Reading it closely changes the conclusion:

- In a hidden tab, rAF stops, the 250 ms watchdog hands over to the timer, and
  browsers throttle background timers to about once a second (Chrome: once a
  minute after five minutes hidden). The cost is roughly a frame a second, not
  an animation running at full rate.
- The timer fallback exists for webviews that report the document hidden while
  still painting it. Pausing on `document.hidden` would freeze the hero in
  exactly those hosts, which is the bug the fallback was written to fix.
- Rendering below the hero is deliberate: the field is the site's background,
  and it lifts through the veil where cues form.

So the trade is a known visible bug for a negligible saving, and it is not
made. The doc comment on `setActive` now says what it actually does.

### 5. Smaller debt

- Release docs contradict each other: `CONTRIBUTING.md` and the PR template ask
  for a changeset; `RELEASING.md` says changesets is deliberately unused.
  `ci.yml` refers to a release workflow that does not exist.
- No npm provenance, no dependency scanning, no Node version matrix despite
  `engines: >=20`.
- The coverage thresholds in `packages/ui/vitest.config.ts` are never enforced.
- MCP tools have no tests (6 tests, all for `nearest()`); the package has no
  README.
- CLI: `update` writes without creating the directory (ENOENT on a deleted
  folder); `remove theme --force` would delete the whole stylesheet `init`
  recorded; fetches have no timeout; Windows spawn without a shell is untested.
- The registry `$schema` points at a file that is never emitted.
- Category lists are defined three times and their labels disagree
  ("Effects" vs "Effects & motion"); registry `category` is a free string.
- `generate.ts`'s 283-entry synonym table is not checked against the index.
- The docs app has two test files, neither touching UI or routes.
- Four UI tests are timing-sensitive (`matrix-orb`'s animation assertions, and
  5-second timeouts in `hero-grid` and `contribution-graph`). They failed in a
  full run on a loaded machine and passed in isolation. CI runs one job at a
  time, so they pass there, but a flaky test is one people learn to ignore.

## Principles carried into every phase

These already govern the codebase; the plan inherits them rather than
inventing new ones.

1. **`meta.ts` is the single source of truth.** Every new kind of metadata is a
   field there, verified by a test, and flows out through the registry build.
   Nothing downstream — CLI, MCP, docs, agent files — keeps its own copy.
2. **Nothing is claimed that is not measured.** No score without a published
   method, no benchmark without a reproducible harness, no tier without a
   product (ADR 13).
3. **Free stays free.** Accessibility and core tooling are never gated.
4. **An agent that is told something wrong is worse off than one told nothing.**
   Generated agent docs fail CI when stale; metadata that cannot be verified is
   labelled as guidance.
5. **The CLI never modifies source without confirmation.** Fixes are proposed
   as diffs.

## Phases

### Phase 0 — Audit ✅

This document.

### Phase 1 — Trust and foundation

The installer and the site have to be sound before anything is built on them.

1. ✅ **CLI path containment.** Registry file paths and item names are
   validated at the schema boundary and again where they meet the disk; a
   registry path cannot leave the alias directory it names. `remove` deletes
   only inside the directories components install into. The boundary is the
   alias directory rather than the project root on purpose: tsconfig `paths`
   may point at a sibling package in a monorepo, and that is the user's layout
   to choose. Tests use hostile registries and a hostile `components.json`.
2. ✅ **Credential scoping.** The key is sent only over HTTPS (or to loopback),
   and only to the origin it was verified against. `login` records the
   registry; `DOWEL_TOKEN` belongs to the default registry unless
   `DOWEL_TOKEN_REGISTRY` names another. A mismatch is an error, not a silent
   unauthenticated request, so the person learns why rather than seeing a 401.
3. ✅ **Dependency specifier validation.** Registry `dependencies` must be npm
   names with an optional version range.
4. ✅ **CLI bug fixes:** `update` creates missing directories, `remove theme`
   never deletes the stylesheet, and requests time out after 30 s.
5. **Preview code-splitting.** Generate one lazy import per story so a page
   loads only its own previews; add a build check that fails if any single
   client chunk exceeds a budget.
6. ✅ **Hero visibility** — investigated and deliberately left alone; see
   finding 4.
7. **MCP contract tests** for every tool, against a fixture registry.
8. ✅ **Release hygiene.** `CONTRIBUTING.md` and the PR template now ask for a
   `CHANGELOG.md` entry instead of a changeset, matching `RELEASING.md`.
   Dependabot (with a 7-day cooldown, the same reasoning as pnpm's
   `minimumReleaseAge`) and CodeQL are added. A CI matrix runs the built CLI,
   MCP server and scaffolder on Node 20 and 22, because `engines` promised 20
   and nothing ran there. The floor is now stated accurately as 20.12, which
   `@clack/prompts` requires, and the root scripts are type-checked. npm
   provenance needs publishing from CI with trusted publishing configured on
   npmjs.com; the release is deliberately manual today, so that is left as a
   decision rather than a dormant workflow.

_Value:_ trust is the adoption bottleneck for any tool that writes into
someone's repository. Phase 1 items 1–3 are prerequisites for an enterprise
conversation of any kind.

### Phase 2 — The Component Genome

Extend `ComponentMeta` with optional, test-verified fields rather than build a
parallel system:

```ts
guidance?: {
  useWhen: string[];      // "confirming a destructive action"
  avoidWhen: string[];    // "navigation — use a link"
  alternatives?: string[]; // registry names, verified to exist
};
composesWith?: string[];  // registry names, verified to exist
capabilities?: {
  rtl: boolean;           // derived from audit:rtl, not declared
  reducedMotion: boolean; // derived from audit:motion
  server: boolean;        // derived: no "use client"
};
props?: PropSummary[];    // derived from the source, as the docs already do
```

The rule for each field is **derive if possible, declare if not, verify
either way**. `server` and `rtl` are facts the build can compute, so a human
never types them. `useWhen` cannot be derived, so it is declared, and the test
checks only that what it references exists. `props` is already extracted by
`apps/docs/scripts/prepare.ts`; moving that extraction into the registry build
makes it available to the CLI, MCP and agent docs, and removes the reason
`plan_ui` stops short of props.

Collapse the triplicated category list into the schema, make the registry's
`category` an enum, and publish the JSON Schema the `$schema` field already
points at.

_Value:_ this is what makes the MCP server and agent files materially better
than reading the source — the difference between an agent picking `Dialog` and
picking it for the right reason.

### Phase 3 — Developer tooling ✅

See ADR 16 for the decisions.

1. ✅ **`dowel doctor`** — read-only checklist: project shape, alias against
   `tsconfig.json`, tokens in the stylesheet, installed files present (local
   edits counted, not flagged), npm packages and component dependencies,
   licence for Pro items, updates available, stale agent docs. Pass, warn,
   fail or skip; non-zero exit only on a failure. No score.
2. ✅ **`dowel diff [names…]`** — unified diff from the local file to the
   registry's.
3. ✅ **`dowel audit [paths…]`** — six rules, each matching only what is wrong
   wherever it appears: palette colours, literal colours in classes and inline
   styles, off-scale arbitrary sizes, physical direction utilities, and native
   elements when the replacing Dowel component is installed. The rules live in
   `@dowel-ui/registry` and `audit:rtl` / `audit:tokens` import them, so the
   library and a project run the same code. Moving them found and fixed an
   over-broad exemption in the old RTL audit. `--fix` rewrites only the
   physical utilities and asks first.
4. ✅ **The verification standard** is written down in ADR 16: the ten
   per-component checks the genome carries, plus the repository-wide audits.
   A third-party "Verified" mark waits for phase 6's browser checks, which
   now exist (ADR 18) but still carry a baseline of known violations.

_Value:_ doctor and audit are what make Dowel useful _after_ install, which is
where retention is decided. Audit is also the first feature a team lead, rather
than an individual developer, would ask for.

### Phase 4 — AI infrastructure ✅

See ADR 17.

1. ✅ **The genome reaches agents.** `get_component` carries guidance,
   capabilities and props; `search_components` matches on guidance; the agent
   files list "Use for / Not for / Often with" under each component; the
   planners score guidance above a description. Existing MCP tool names are
   unchanged.
2. ✅ **`audit_code`** — the `dowel audit` rules as an MCP tool, so an agent
   checks what it wrote before a person sees it.
3. ✅ **`create-dowel-app` writes the agent files** at scaffold time.
4. ✅ **`dowel plan [--model]`** — the built-in planner by default; with
   `--model`, Claude chooses from the catalogue and `planFromPicks` holds the
   result to the registry. Opt-in, the person's own credentials, the SDK an
   optional peer. Not on the website and not inside MCP, for the reasons in
   ADR 17. Tested offline against a stand-in SDK; no live call was made.

_Value:_ technical differentiation. The defensible claim is not "AI
generates UI" — everyone has that — but "the agent's output is checked against
a design system that knows itself".

### Phase 5 — AgentBench (scoped)

A benchmark is only worth publishing if anyone can rerun it. Start with:

- 10 tasks, each a prompt plus a fixed starting project.
- One harness that runs an agent CLI headless, captures the diff, and scores it
  with checks that are already automated: `tsc`, `next build`, axe on the
  rendered page, `dowel audit` drift and token findings, and whether the
  components used exist.
- Two conditions per agent: with Dowel's agent files and MCP, and without.
  This measures what Dowel controls — whether its agent support helps — rather
  than ranking vendors, which invites disputes and terms-of-service problems.
- Every run's prompt, transcript, diff and score published, failures included.

Visual quality and "time to completion" are left out until there is a way to
measure them that two people would agree on.

Progress:

1. ✅ **Harness** — `packages/agentbench`: workspaces built from this commit's
   scaffolder, CLI, MCP server and registry; the two conditions; the diff
   against a committed baseline; `tsc`, `dowel audit`, invented and
   uninstalled imports, recall, and the repository's jsx-a11y rules.
2. ✅ **Ten tasks**, every registry name checked by a test.
3. ✅ **One adapter**, Claude Code, with flags checked against its `--help`;
   `noop` and `reference` validate the pipeline without spending anything.
4. **`next build` and axe on the rendered page** — not yet; both need
   installed dependencies, and axe a served page and a browser (phase 6).
5. **A published run** — none. The first is a person's, with their own
   account; `/agentbench` says so until then.

_Value:_ a reproducible result that agent docs and MCP improve output is the
strongest evidence the "AI-native" positioning can have, and the harness doubles
as a regression test for the agent files.

### Phase 6 — Visual and browser CI

See ADR 18. Everything below is in CI (`.github/workflows/browser.yml` and
`ci.yml`); what has and has not been run is stated per item.

1. ✅ **Visual regression** — `toHaveScreenshot` for a curated 42 stories rather
   than all 295 files (1,346 stories): foundations, forms, seven overlays open,
   data, feedback, AI and five blocks; light and dark, LTR and RTL, 1280 px,
   and the blocks again at 390 px — 188 images. Generated and compared only in
   the Playwright image matching `@playwright/test`, forced to `linux/amd64`;
   reduced motion, `--motion-scale: 0`, a fixed clock, a seeded
   `Math.random`, no external network, zero pixel tolerance. The system font
   stack resolves to the container's fonts, so "fonts bundled" means the
   image's fonts, pinned with it. RTL needed a `direction` toolbar global that
   also wraps the story in `DirectionProvider`. The 188 baselines were written in that
   container (emulated x86-64 on Apple silicon) and a second run matched all
   188 with zero differing pixels; they have not yet been compared on a
   GitHub runner. The `Browser` workflow's manual dispatch rewrites them there
   if the first CI run disagrees.
2. ✅ **axe in the real browser** over every story, light and dark, with
   `color-contrast` and `target-size` on. 140 violations on 82 stories, each
   in `known-violations.json` with a reason (70 "to fix"); the suite fails on
   anything new and on any entry that stops occurring, so the list only
   shrinks. macOS and the container found the identical 140.
3. ✅ **Coverage thresholds enforced.** CI runs the component suite once, with
   coverage. Measured: statements 97.3%, branches 93.4%, functions 97.5%,
   lines 98.7%, against floors of 85/80/85/85.
4. ✅ **Install check in CI** (`scripts/smoke/install-all.mjs`): the local
   scaffolder, CLI and registry put all 291 free items into a fresh Next.js
   app, then `tsc --noEmit` and `next build`, with a page importing all 354
   installed modules so every one is compiled. Passed locally in 9 minutes;
   runs on every pull request, alongside `verify`.

Found on the way, not fixed here (component work): status text on its own
10% tint fails 4.5:1 across every soft status badge; `FormControl` wrapping a
`Select` labels nothing; the calendar's month navigation is positioned
against the nearest positioned ancestor rather than the calendar. See ADR 18.

### Phase 7 — Enterprise foundations ✅

See ADR 19.

1. ✅ **Private registries.** Any registry that answers `401` is private: the
   CLI asks without a key, then once with the key stored for that registry and
   no other. Keys are stored per registry; `login --registry` verifies against
   the index when there is no licence endpoint; the MCP server reads
   `DOWEL_TOKEN` / `DOWEL_TOKEN_REGISTRY`.
2. ✅ **Governance metadata** — `owner`, `since`, `deprecated` (with a
   replacement), honoured by `add`, `update`, `list`, `doctor`, MCP, the agent
   docs and the planners. Deprecation never removes. Custom registries can
   declare guidance too, and the build rejects names that do not exist.
3. ✅ **Organisations, roles, audit events and usage reports** written down as
   interfaces in ADR 19, with the decisions they encode. Not built.

### Phase 8 — Cloud

Only when there is demand evidence: teams asking for a hosted private
registry, or audit results across repositories. Until then the self-hosted
registry and the CLI's local audit are the product.

## Deliberately not planned

- **A `DOWEL.md` file.** `AGENTS.md` is the convention coding agents converge
  on, Claude Code reads skills, and Cursor reads its rules directory. Dowel
  already writes all three. A new filename would be read by no tool until
  vendors adopted it; if one is wanted for humans, it can be a pointer to
  `.dowel/`.
- **More components for the count.** 244 is enough; the next gains come from
  telling agents how to use them.
- **Renaming `/theme-studio`.** It is linked from the README and npm.
- **A scored "health out of 100"** before the checks behind it are published.
- **Vendor-ranking benchmarks**, a showcase without real submissions, or a
  marketplace before there is a second seller.
- **Payments beyond the existing Polar checkout link** until Pro has buyers.

## How each phase ends

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit:all`;
for CLI changes, the fresh-app install check in RELEASING.md; a changelog entry;
an ADR where a decision constrains future work.
