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
npx @dowel-ui/cli init
npx @dowel-ui/cli add button
```

That second command writes `button.tsx` into your project. Open it. Change it.
It is your file now — there is no package standing between you and the markup.

**Live:** [dowel-eight.vercel.app](https://dowel-eight.vercel.app) — docs, every
component, and the registry the CLI reads.
**Published:** `@dowel-ui/react`, `@dowel-ui/cli`, `@dowel-ui/themes`,
`@dowel-ui/registry`.

## What is in it

**56 components** and **8 blocks**, every one keyboard-operable and audited for
contrast in light and dark.

**AI** — Conversation · Message · Response · Prompt Input · Tool Call ·
Reasoning · Sources · Model Selector · Token Usage · Agent Status ·
Agent Plan · Approval Request · Action Ledger · Structured Output ·
Inline Completion

**Forms** — Input · Label · Checkbox · Radio Group · Switch · Slider · Select ·
Combobox · Form · Calendar · Date Picker · **Tags Input** · **File Upload**

**Overlays** — Dialog · Sheet · Drawer · Popover · Tooltip · Dropdown Menu

**Data** — Table · Data Table · Accordion · Activity Feed · Code Block ·
Metric Delta · Record Diff

**Feedback** — Alert · Toast · Progress · Meter · Skeleton · Spinner ·
Empty State

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

Login · Sign up · Forgot password · Dashboard · Admin users · Settings ·
Pricing · AI Chat

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
