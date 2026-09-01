# 3. Typed component metadata, verified against real imports

- **Status:** Accepted
- **Date:** 2026-08-31
- **Phase:** 1

## Context

The CLI's `add` command must know, for any component, which npm packages to
install and which other components to pull in transitively. If that metadata is
wrong the failure does not surface in this repository — it surfaces as a broken
build in the user's project, after they have already run the command. This is
the most common failure mode in source-first component libraries, and it is
caused by hand-maintained metadata drifting from the source it describes.

## Decision

Each component directory ships a **`meta.ts`**, not a `registry.json`:

```
components/button/
├── button.tsx
├── button.test.tsx
├── button.stories.tsx
├── index.ts
└── meta.ts
```

`meta.ts` exports a plain object typed by `ComponentMeta`. The type is imported
with `import type`, so **no validation library reaches the runtime bundle**.

Correctness is enforced by `src/registry/meta.test.ts`, which runs on every
`pnpm test`. For each component it parses the source files listed in
`meta.files` and asserts that:

- declared `dependencies` are **exactly** the bare npm specifiers imported,
- declared `registryDependencies` are **exactly** the `@/components/*` imports,
- every `@/`-aliased import is one that `<cli> init` actually installs,
- every relative import resolves inside the declared file set,
- every declared dependency is really present in the package's `dependencies`,
- the registry name matches the directory name, and is unique,
- an index, a test and a story all exist.

Set equality in both directions matters: an over-declared dependency installs
packages the user does not need, which is a quieter but real defect.

## Consequences

- Metadata cannot silently drift. Adding an import to a component without
  declaring it fails the test suite immediately.
- The check already caught its intended class of bug during Phase 1: `Button`
  gained a `Spinner` import, and the test required `registryDependencies:
["spinner"]` before it would pass.
- `meta.ts` is TypeScript, not JSON, so it gets editor autocomplete and
  refactoring support via `defineMeta`.
- **Phase 4** turns these objects into the public JSON registry. The build step
  reads `meta.ts`, adds per-file content hashes (which `<cli> update` needs to
  detect local modification), and emits `/r/index.json` plus `/r/<name>.json`.
  Content hashing must land in `add` at the same time as the registry, because
  it cannot be retrofitted onto installs that already happened.
