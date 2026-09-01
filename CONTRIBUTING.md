# Contributing

## Setup

Requires Node ≥ 20 (developed on 26) and pnpm 11.

```bash
pnpm install
pnpm storybook     # component development environment, http://localhost:6006
```

## The quality gate

Everything must pass before a change is complete. CI runs exactly this:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Do not disable a lint rule, cast to `any`, or add `@ts-expect-error` to get a
green run. If a rule is genuinely wrong for a case, fix the code so the rule is
satisfied honestly — during Phase 1 a `jsx-a11y/heading-has-content` report on
`CardTitle` was resolved by destructuring `children` so the heading's content is
statically visible, not by silencing the rule.

## Adding a component

Read [`docs/architecture/0004-component-conventions.md`](docs/architecture/0004-component-conventions.md)
first. Then:

1. Create `packages/ui/src/components/<name>/` with `<name>.tsx`,
   `<name>.test.tsx`, `<name>.stories.tsx`, `index.ts` and `meta.ts`.
2. Export it from `packages/ui/src/index.ts`.
3. Run `pnpm test`. The registry integrity suite will tell you if `meta.ts`
   disagrees with what your source actually imports.
4. Add a changeset: `pnpm changeset`.

### What a component must do

- Extend `ComponentPropsWithRef<E>` and spread `...props` onto its root.
- Run `className` through `cn()`, and prove with a test that a conflicting
  consumer utility wins.
- Define variants with `cva`, exporting `<name>Variants`.
- Reuse `focusRing`, `disabledStyles`, `invalidStyles` and `iconSlot` from
  `@/lib/styles` rather than restating interaction states.
- Work in light and dark mode, and against the `monochrome` preset — if a
  component becomes unusable without colour, colour was carrying meaning it
  should not have been carrying.

### What a test must cover

Behaviour, not snapshots: rendering, every variant and size, `className`
override, ref forwarding, keyboard interaction, disabled and loading states,
controlled and uncontrolled modes, and `expectNoA11yViolations`.

## Design tokens

Components reference semantic (Tier 2) tokens only — `bg-primary`,
`text-muted-foreground`, `border-border`. Never a raw scale like
`--color-neutral-400`, and never a hard-coded colour. See
[ADR 2](docs/architecture/0002-design-tokens.md).

If you add a custom Tailwind scale, register it in `extendTailwindMerge` inside
`packages/ui/src/lib/utils.ts` and add a `cn()` test for it. Without that,
consumer overrides of that scale silently do nothing.

## Commits and PRs

Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
Fill in the PR checklist. Keep PRs scoped to one component or one concern.

## Releasing

See [RELEASING.md](RELEASING.md). The one rule worth knowing before you touch
either: the documentation site hosts the registry the CLI reads, so **the site
is deployed before the packages are published** — on every release, not just the
first.

## Architecture decisions

Anything that constrains future work — a dependency choice, an API pattern, a
build decision — gets an ADR in `docs/architecture/`. Record the options that
were rejected and why; that is the part that is useful in a year.
