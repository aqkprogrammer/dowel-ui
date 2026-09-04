<div align="center">

# Dowel

### Source-first React components for SaaS and AI products

**You install the code, not a dependency.**

[![npm](https://img.shields.io/npm/v/@dowel-ui/react?color=5b5bd6&label=%40dowel-ui%2Freact)](https://www.npmjs.com/package/@dowel-ui/react)
[![CI](https://github.com/aqkprogrammer/dowel-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/aqkprogrammer/dowel-ui/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@dowel-ui/react?color=5b5bd6)](LICENSE)

[**Documentation**](https://dowel-eight.vercel.app) · [**Components**](https://dowel-eight.vercel.app/docs/components) · [**CLI**](https://dowel-eight.vercel.app/docs/cli)

</div>

---

A dowel is the hidden pin that joins two pieces of wood without a visible
fastener. That is the idea here: components that fit together, hold, and then
get out of your way.

```bash
npx create-dowel-app my-app
```

Or add it to a project you already have:

```bash
npx @dowel-ui/cli init
npx @dowel-ui/cli add button
```

That second command writes `button.tsx` into your project. Open it. Change it.
It is your file now — there is no package standing between you and the markup.

**Live:** [dowel-eight.vercel.app](https://dowel-eight.vercel.app) — docs, every
component, and the registry the CLI reads. Also a
[playground](https://dowel-eight.vercel.app/playground), a
[theme studio](https://dowel-eight.vercel.app/theme-studio) that checks contrast
as you pick, and [per-component quality](https://dowel-eight.vercel.app/quality).
**Published:** `@dowel-ui/react`, `@dowel-ui/cli`, `@dowel-ui/themes`,
`@dowel-ui/registry`, `@dowel-ui/mcp`, `create-dowel-app`.

## What is in it

**71 components** and **13 blocks**, every one keyboard-operable and audited for
contrast in light and dark.

**AI** — Conversation · Message · Response · Prompt Input · Tool Call ·
Reasoning · Sources · Model Selector · Token Usage · Agent Status ·
Agent Plan · Approval Request · Action Ledger · Structured Output ·
Inline Completion · Disclosure · **Extraction Review** ·
**Suggested Value**

**Forms** — Input · Label · Checkbox · Radio Group · Switch · Slider · Select ·
Combobox · Form · Calendar · Date Picker · Tags Input · File Upload ·
**Textarea** · **Time Range Picker** · **Cron Editor** · **Secret Field** ·
**Confirm Typed** · **Shortcut Recorder**

**Overlays** — Dialog · Sheet · Drawer · Popover · Tooltip · Dropdown Menu

**Data** — Table · Data Table · Accordion · Activity Feed · Code Block ·
Metric Delta · Record Diff · **Log Viewer** · **Diff Viewer** · **Permission Matrix** ·
**DNS Record**

**Feedback** — Alert · Toast · Progress · Meter · Skeleton · Spinner ·
Empty State · **Sync Status** · **Session Expiry**

**Navigation & layout** — Tabs · Command · Pagination · Card · Badge · Avatar ·
Button · Separator

## The AI components

Most AI component sets ship a chat transcript and stop. Real AI features inside
real software are extraction, enrichment, autofill, and agents that _change
things_ — which need surfaces nobody else provides.

**`ai-action-ledger`** — what the agent actually did, and what can be undone.
Everyone ships approval _before_ a tool runs; nothing ships the part after,
where a deletion can be reverted, a refund can only be offset by another
transaction, and a sent email cannot be taken back at all.

**`ai-structured-output`** — an object arriving field by field, layout reserved
up front so nothing jumps as it fills in.

**`ai-inline-completion`** — ghost text in a real textarea. Escape always gives
Tab back to focus management, so a keyboard user is never trapped.

## Blocks

Whole sections, assembled from components. Installing one brings everything it
is built from — `add ai-chat` resolves fourteen components.

**Auth** — Login · Sign up · Forgot password

**SaaS** — Dashboard · **Analytics** · **Billing** · **Onboarding** ·
Admin users · Settings · Pricing

**AI** — AI Chat · **AI Dashboard** · **Agent Console**

`billing` states every usage meter in words rather than as a bar that turns red.
`analytics` treats its chart as a picture — one summarising label, and the exact
numbers as a real table anyone can open. `ai-dashboard` marks spend and failure
rate as lower-is-better, because a dashboard that paints a rising bill green is
congratulating you on it. `agent-console` puts whatever the run is blocked on
above the plan and the history, since it is the only part waiting on a person.

```tsx
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
} from "@dowel-ui/react";

<Card>
  <CardHeader>
    <CardTitle>Create project</CardTitle>
  </CardHeader>
  <CardContent>
    <Input placeholder="Project name" />
  </CardContent>
  <CardFooter>
    <Button>Create project</Button>
  </CardFooter>
</Card>;
```

Form wires field accessibility without binding to a form library. Pass `error`
from wherever your state lives — `useState`, React Hook Form, a server action —
and the markup is identical:

```tsx
<FormField name="email" error={errors.email?.message}>
  <FormLabel>Email</FormLabel>
  <FormControl>
    <Input {...register("email")} />
  </FormControl>
  <FormDescription>We will never share it.</FormDescription>
  <FormMessage />
</FormField>
```

Toast has an imperative API, callable from anywhere — no hook, no provider
lookup. Render `<Toaster />` once near the root:

```tsx
import { toast } from "@dowel-ui/react";

toast.success("Project created", { description: "It is ready to use." });

await toast.promise(save(), {
  loading: "Saving…",
  success: (name) => `Saved ${name}`,
  error: "Could not save",
});
```

## CLI

Set a project up once, then add components as source you own:

```bash
npx @dowel-ui/cli init
npx @dowel-ui/cli add button card dialog
```

`add` pulls in whatever a component depends on — `add date-picker` also installs
Calendar, Popover, Button and Spinner — installs the npm packages it needs, and
rewrites imports to your project's own path alias.

| Command        | Does                                                               |
| -------------- | ------------------------------------------------------------------ |
| `init`         | Writes `components.json`, the `cn()` utility and the design tokens |
| `add <names…>` | Installs components and everything they depend on                  |
| `list`         | Shows the registry, marking what you already have                  |
| `update`       | Compares installed components against the registry                 |
| `agents`       | Writes the catalogue for the coding agents in this project         |
| `login`        | Stores a licence key, for components that need one                 |
| `whoami`       | Reports whether this machine is signed in                          |

Useful flags: `--registry <url-or-directory>` to point at a fork or mirror,
`--yes` for CI, `--overwrite` to replace files you have edited, `--cwd` to run
against another directory.

**Re-running `add` is safe.** A file you have not touched is left alone because
it already matches; a file you _have_ edited is never overwritten without
`--overwrite`, which is the whole point of owning the source. This works because
`add` records a hash of what it wrote, so `update` can tell your changes apart
from upstream ones.

The CLI refuses, loudly, to install into a project it cannot support correctly:
Tailwind v3 (the tokens use `@theme`), a JavaScript project (the published
source is TypeScript), or a non-React project. Each refusal says what to do
instead.

## Starting from scratch

```bash
npx create-dowel-app my-app
```

Asks what you are building, and which theme, then writes a Next.js app and
fetches the components for it.

| Template  | What you get                                                                     |
| --------- | -------------------------------------------------------------------------------- |
| `starter` | The app, the tokens, the aliases, and a landing page                             |
| `saas`    | An application shell with dashboard, analytics, billing, settings and onboarding |
| `ai`      | A chat surface, an agent console and a usage dashboard                           |

**The templates do not contain the components.** They are the application files
plus a list of registry names, and the scaffolder runs the same CLI you would
run yourself. A template carrying its own copy of Button is carrying whichever
Button was current the day it was written, and nothing ever says so — this way a
project created today is built from today's registry, and a template stays a
dozen files instead of a hundred.

Flags: `--template`, `--theme`, `--pm`, `--yes`, `--skip-install`.

## Generating a screen

```bash
npx @dowel-ui/cli list          # what exists
```

[**dowel-eight.vercel.app/generate**](https://dowel-eight.vercel.app/generate) —
describe a screen, get the components that build it, the install command, and a
brief to paste into your coding agent. The MCP server exposes the same thing as
`plan_ui`, so an agent can ask for it directly.

Every suggestion is resolved against the registry before anything is written, so
it cannot name a component that does not exist — which is what asking a model
directly gets you, complete with a `variant` nobody implemented. It also does
not guess at props: the registry publishes what a component _is_ and what it
depends on, not the shape of its arguments, so the output stops at the
composition and links to the page where the props are documented. A plausible
invented prop is worse than an obvious gap — one is a TODO, the other is a bug
wearing the costume of working code.

## Your own registry

The CLI has always installed from any registry — `--registry` takes a URL or a
directory. `@dowel-ui/registry` now builds one, so an organisation can publish
its own components and have them installed exactly the same way.

```ts
import { buildCustomRegistry, defineRegistryConfig } from "@dowel-ui/registry";

const result = await buildCustomRegistry(
  defineRegistryConfig({
    root: "src",
    generatedFrom: "@acme/ui@1.0.0",
    // One URL that serves both your components and everything upstream.
    extends: "https://dowel-eight.vercel.app/r",
    items: [
      {
        name: "acme-callout",
        title: "Acme Callout",
        description: "Acme's house callout, built on the upstream Badge.",
        category: "display",
        registryDependencies: ["badge"],
        files: ["acme-callout.tsx"],
      },
    ],
  }),
);
```

Point a project at the result and `add acme-callout` installs it, pulling in
`badge` from upstream on the way.

**A local item replaces an upstream one of the same name**, and the build tells
you which — overriding upstream's Button is a legitimate thing to want and a
catastrophic thing to do by accident, and the difference is whether anyone was
told.

The build refuses three things rather than letting them fail in a consumer's
repository:

- a **file it cannot read**;
- an import written against the **installed** path (`@/components/ui/badge`)
  rather than the authored one (`@/components/badge`) — the leading group is
  rewritten to wherever the project keeps its components, so naming it twice
  produces a path that resolves nowhere;
- a component that **imports something it never declared**, which would not be
  installed alongside it.

## Coding agents

An agent that has never heard of Dowel writes its own Button — a second one,
with a different focus ring, different disabled semantics and hardcoded
colours, and now the design system has a hole in it that nobody notices until
someone tabs into it.

```bash
npx @dowel-ui/cli agents
```

Writes the catalogue and the conventions into your repository, generated from
the registry you install from, marking what you already have:

| Writes                             | For                                           |
| ---------------------------------- | --------------------------------------------- |
| `.dowel/*.md`                      | Any agent that reads the repository           |
| `AGENTS.md`                        | A marked block; the rest of the file is yours |
| `.claude/skills/dowel-ui/SKILL.md` | Claude Code                                   |
| `.cursor/rules/dowel-ui.mdc`       | Cursor                                        |

`--check` writes nothing, reports what is stale and exits non-zero — a
catalogue a release behind is worse than none, because the agent trusts it.

**MCP.** The files are a snapshot; `@dowel-ui/mcp` is the live version. The
agent queries the registry directly, reads a component's real source rather
than a description of it, and is told when it has typed a name that does not
exist.

```json
{
  "mcpServers": {
    "dowel": {
      "command": "npx",
      "args": ["-y", "@dowel-ui/mcp"],
      "env": { "DOWEL_IMPORT_FROM": "@/components/ui" }
    }
  }
}
```

Four tools: `search_components`, `get_component`, `get_guide`,
`install_command`.

**llms.txt.** For an agent that can fetch a URL but not run a server, the site
serves [`/llms.txt`](https://dowel-eight.vercel.app/llms.txt) (the index) and
[`/llms-full.txt`](https://dowel-eight.vercel.app/llms-full.txt) (everything in
one request), generated at build time from the same registry.

## Development

Requires Node ≥ 20 and pnpm 11.

```bash
pnpm install
pnpm storybook
```

| Command               | Does                                                     |
| --------------------- | -------------------------------------------------------- |
| `pnpm storybook`      | Component development environment on :6006               |
| `pnpm test`           | Vitest, including the registry integrity suite           |
| `pnpm lint`           | ESLint, including `jsx-a11y`                             |
| `pnpm typecheck`      | `tsc --noEmit` across every package                      |
| `pnpm build`          | Build all packages                                       |
| `pnpm check:branding` | List every surviving branding placeholder                |
| `pnpm audit:all`      | Contrast, tokens, API conventions, bundle, npm packaging |

## Design system

Tokens are two-tier. Tier 1 is raw scales — a cool-tinted OKLCH neutral ramp, a
radius ladder, a 15px-base type scale, elevation, motion. Tier 2 is semantic
aliases (`--primary`, `--border`, `--ring`) that components consume exclusively.
Re-skinning the system means reassigning Tier 2; no component file changes.

Seven presets ship: `default`, `ocean`, `emerald`, `violet`, `rose`, `amber`,
`monochrome`. Apply one with `data-theme` on `<html>`; dark mode is the `dark`
class. A single `--radius-scale` custom property re-proportions every corner in
the system at once.

`monochrome` is not only a style — it is a standing check that no component uses
colour as its only signal.

Motion works the same way. `--motion-scale` is a single multiplier every
duration derives from, so one property re-times the whole system. Under
`prefers-reduced-motion` it collapses — but indicators that report ongoing
state, like a spinner or a streaming caret, are slowed rather than stopped via
`--motion-scale-indicator`, because a frozen spinner says the application has
hung.

## Accessibility

Targeted at WCAG 2.2 AA. Every component has an axe assertion in its test suite
and runs under the Storybook a11y addon with findings set to fail rather than
warn. Keyboard interaction is tested, not assumed.

Contrast is checked separately, because a test environment that never paints
cannot check it: `audit:contrast` converts the OKLCH tokens to sRGB and verifies
all 322 semantic pairs across both modes and all seven presets. It runs in CI.

A few choices worth knowing about, because they differ from what similar
libraries do:

- A **loading `Button`** uses `aria-disabled` + `aria-busy` and guards its click
  handler, rather than the `disabled` attribute. Disabling a control mid-action
  strands the user's keyboard focus.
- **`Alert` is not a live region by default.** One that exists on first paint
  announces for no reason. Opt in with `live="polite"` or `live="assertive"`.
- **`Separator`, `Skeleton` and `Spinner` are decorative by default** and stay
  out of the accessibility tree unless you give them a label.
- **`PopoverContent` warns in development when it has no accessible name.** It
  carries `role="dialog"`, so without `aria-label` or `aria-labelledby` it is
  announced as an unnamed dialog — a defect that is invisible in the browser.
- **A gesture is never the only way out.** Drawer can be dragged away, but
  Escape, the overlay and an explicit cancel are always there too.

- **`Slider` forwards its name onto the thumbs**, because the thumb is the
  `role="slider"` element. Use `thumbLabels` to name each end of a range
  separately — two thumbs called "Price" tell a screen reader user nothing.
- **`Form` never names an element that was not rendered.** `aria-describedby`
  is assembled from the description and error that actually exist.

- **`Table`'s scroll wrapper is focusable.** A table that overflows its
  container is otherwise unreachable by keyboard.
- **Sortable headers carry `aria-sort`** plus hidden text naming the column and
  direction; an arrow icon is no signal for a screen reader.
- **A streaming transcript is not a live region.** Announcing text token by
  token interrupts a screen reader continuously; state is announced separately
  and the content is left navigable. This is the most common accessibility
  failure in chat interfaces.
- **The composer does not send mid-IME-composition**, which otherwise truncates
  Japanese, Chinese and Korean input mid-word.

Drawer, Toast, Combobox and Command are built on primitives rather than on
`vaul`, `sonner` and `cmdk`, so the runtime footprint stays at `radix-ui`,
`cva`, `clsx`, `tailwind-merge`, plus `react-day-picker` for Calendar and
`@tanstack/react-table` for Data Table. See ADRs
[5](docs/architecture/0005-overlay-dependencies.md),
[6](docs/architecture/0006-form-layer.md) and
[8](docs/architecture/0008-data-layer.md).

## Architecture

Decisions that constrain future work are recorded in
[`docs/architecture/`](docs/architecture):

1. [Toolchain](docs/architecture/0001-toolchain.md) — why TypeScript 6 and
   ESLint rather than TypeScript 7 and Biome
2. [Design tokens](docs/architecture/0002-design-tokens.md) — two-tier OKLCH
   tokens under Tailwind v4
3. [Registry metadata](docs/architecture/0003-registry-metadata.md) — typed
   metadata verified against real imports
4. [Component conventions](docs/architecture/0004-component-conventions.md)
5. [Overlay dependencies](docs/architecture/0005-overlay-dependencies.md) — why
   Drawer and Toast are built in-house
6. [The form layer](docs/architecture/0006-form-layer.md) — one dependency, and
   why Form is not bound to a form library
7. [The CLI and the registry](docs/architecture/0007-cli-and-registry.md) — why
   install hashes had to exist from the first release
8. [The data layer](docs/architecture/0008-data-layer.md) — typing against a
   feature-modular table library
9. [The AI layer](docs/architecture/0009-ai-components.md) — why a streaming
   transcript must not be a live region
10. [The documentation site](docs/architecture/0010-documentation-site.md) — why
    it is built on the library rather than a docs framework
11. [Blocks](docs/architecture/0011-blocks.md) — what composing components
    revealed about them
12. [Audits](docs/architecture/0012-audits.md) — the 88 contrast failures, and
    what fixing them revealed about the palette

## Requirements

React 19, Tailwind CSS **v4** (v3 is not supported — tokens are defined in CSS
via `@theme`), and a bundler that handles CSS imports.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Read the component conventions before
adding a component; the test suite enforces most of them.

## License

[MIT](LICENSE)
