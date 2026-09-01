## What changed

<!-- One or two sentences. -->

## Why

<!-- The problem this solves. Link an issue if there is one. -->

## Checklist

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes

For component changes:

- [ ] Behavioural tests cover the new behaviour (not snapshots)
- [ ] `expectNoA11yViolations` passes, and keyboard interaction is tested
- [ ] Stories cover the new variants and states
- [ ] `meta.ts` is updated if imports changed
- [ ] Works in light **and** dark mode, and against the `monochrome` preset
- [ ] Follows `docs/architecture/0004-component-conventions.md`
- [ ] A changeset is included (`pnpm changeset`)
