# 1. TypeScript 6 and ESLint over TypeScript 7 and Biome

- **Status:** Accepted
- **Date:** 2026-08-31
- **Phase:** 1

## Context

At the time of writing, `typescript@7.0.2` is the latest stable release. However
`typescript-eslint@8.68.0` — the current latest, with no `next` tag published —
declares its TypeScript peer range as `>=4.8.4 <6.1.0`. TypeScript 7 is outside
that range, so type-aware linting is unavailable on TS 7 today.

Three options were considered:

1. **TypeScript 6.0.3 + ESLint 10 + typescript-eslint.** Fully supported, gives
   type-aware rules and `eslint-plugin-jsx-a11y`.
2. **TypeScript 7.0.2 + Biome 2.5.11.** Biome has its own parser and no
   TypeScript peer dependency, so the conflict disappears, and it is
   substantially faster while unifying lint and format. Its React and
   accessibility rule coverage is narrower than `eslint-plugin-jsx-a11y`.
3. **TypeScript 7 with no type-aware linting.** Rejected outright.

## Decision

Option 1. TypeScript `6.0.3`, ESLint `10.9.1`, `typescript-eslint@8.68.0`,
`eslint-plugin-jsx-a11y@6.10.2`, Prettier `3.9.6`.

For an accessibility-first component library, the breadth of `jsx-a11y`'s rule
set is worth more than one TypeScript major version or a faster linter. Linting
runs in CI and locally on changed files; its speed is not on the critical path.

## Consequences

- We are one TypeScript major behind. This is reversible: bump TypeScript the
  moment `typescript-eslint` widens its peer range. Nothing in the codebase
  depends on TS 6-only behaviour.
- `baseUrl` is not used anywhere — TS 6 deprecates it (TS5101). Path aliases are
  declared with `paths` alone, which resolve relative to the `tsconfig.json`.

## Known issue: jsx-a11y's peer range

`eslint-plugin-jsx-a11y@6.10.2` declares `eslint: "^3 || ... || ^9"`, which does
not include ESLint 10, so `pnpm peers check` reports it as unmet.

This was verified empirically rather than assumed. A probe file containing an
`<img>` with no `alt`, a `<div>` with an `onClick` and no keyboard handler, and
an `<a>` with no `href` was linted under ESLint 10.9.1; all four expected rules
(`alt-text`, `click-events-have-key-events`, `no-static-element-interactions`,
`anchor-is-valid`) reported correctly. The stale range is a declaration lag, not
a functional break.

**Watch item:** re-verify on any ESLint 10.x minor bump. If the plugin ever does
break, the fallback is ESLint 9.39.x, which every other plugin in the toolchain
already supports (`@eslint/js` would need to move to 9.x alongside it).

## Also pinned for a reason

`vitest@4.1.11` is unusable: it depends on `@vitest/spy@4.1.11`, which was never
published to npm, so installation fails outright. We are pinned to `4.1.10`.
