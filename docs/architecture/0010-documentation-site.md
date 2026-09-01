# 10. The documentation site

- **Status:** Accepted
- **Date:** 2026-09-01
- **Phase:** 7

## Context

The docs site has two jobs: explain the library, and **host the registry**. The
second is what makes the CLI real — until this phase, `--registry` only ever
pointed at a directory on disk.

## Built on the library, not on a docs framework

The audit recommended Fumadocs. That was the wrong call and it is worth saying
why.

A documentation site for a component library is the library's first real
consumer. Building it on someone else's theme would mean the site demonstrates
their design system while describing ours, and — more importantly — we would
never find out what it is like to actually build something with these
components.

That paid for itself immediately: building this site surfaced two genuine
packaging defects (below) that no amount of unit testing would have found,
because both only appear when the package is consumed from outside.

The navigation, search palette, theme switcher, code blocks, tables and tabs on
this site are all the library's own components. The ⌘K search _is_ `Command`.

The cost is no MDX authoring: guide pages are TSX with a `Prose` component.
Acceptable for six pages, and worth revisiting if the guides grow.

## Nothing is written twice

Two generation steps, both following the rule the registry already established.

**Component pages are generated from the registry.** Description, status,
dependencies, accessibility notes and source all come from the JSON the CLI
fetches — read from `public/r`, the exact bytes that get served. The
documentation cannot describe something different from what gets installed.

**Previews are the Storybook stories.** `scripts/prepare.ts` generates static
imports for every `*.stories.tsx`, and `StoryPreview` renders them. The examples
on a component page are the same stories that run in CI, so there is no second
set of examples to drift.

Story modules cross that boundary as `unknown` and are narrowed by runtime
guards, rather than by restating Storybook's generics — which are far more
elaborate than rendering needs and would break on every upgrade.

## Two defects this phase found

Both would have shipped, and both only surface when the package is consumed.

**1. The build stripped `"use client"`.** Bundling merges modules into shared
chunks, and a chunk mixing a client component with anything else loses the
directive — making the published package unusable in any React Server
Components app. Fixed with `unbundle: true`, so each module keeps its own
directive.

**2. `Button` was missing `"use client"` entirely.** It attaches an `onClick`
handler for the loading guard, so rendering it from a Server Component tried to
pass a function across the boundary and failed. An audit script now checks every
component for hooks, context and JSX event props against the directive; Button
was the only one missing.

## Alias collision, and what it demonstrates

The library's source imports `@/lib/utils`. So does a Next app, meaning its own
`src`. Rendering library source inside the docs app makes those collide.

Resolved by giving the docs app `~/` and handing `@/` to the library. This is
worth noting because it is exactly the problem the CLI solves for consumers by
rewriting imports on install — the docs site just hits it from the other side.

## A stale registry fails loudly

Turbo's dependency graph rebuilds the registry before the docs build, but a bare
`next build` does not — and publishing a stale registry means the site documents,
and the CLI installs, code that no longer exists.

`prepare.ts` compares the registry's timestamp against the newest component
source and refuses to continue if it is behind. This was not hypothetical: it
happened during this phase, and the symptom was a component installing over HTTP
without the `"use client"` fix that had just been made.

## Typed routes are off

Every component link is built from the registry, so hrefs are strings by
construction; typed routes could only be satisfied by casting them, which would
look like safety while checking nothing. The real guarantee is upstream — the
navigation and `generateStaticParams` read the same registry, so a link to a
component that does not exist cannot be produced.

## Still outstanding

- **The site is not deployed.** It builds to static output and serves the
  registry correctly; picking a host and a domain is a naming decision.
- **No interactive props playground.** The story switcher covers most of what a
  playground offers; a controls panel is a Phase 9 item.
- **No search over guide prose**, only titles and component metadata.
