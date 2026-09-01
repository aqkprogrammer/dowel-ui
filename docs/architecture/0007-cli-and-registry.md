# 7. The CLI and the registry

- **Status:** Accepted
- **Date:** 2026-09-01
- **Phase:** 4

## Context

This is the phase that turns the library from a folder of components into
something installable. Everything before it was verifiable inside this
repository; from here, mistakes land in someone else's project, where they are
hardest to diagnose.

## The registry

**Static JSON over HTTP, generated from the same source the library builds and
tests.** `/r/index.json` for browsing, `/r/<name>.json` per item. No backend, no
database.

Generated from the `meta.ts` files via the typed barrel in `@dowel-ui/react`, so
there is no second copy of a component to drift. The build is **deterministic**:
it records the package version it came from, never a timestamp, so identical
source always produces byte-identical output and a rebuild is not a diff.

`registryVersion` is on every payload, and both sides validate against the same
Zod schema — the build refuses to emit anything malformed, and the CLI refuses
to install anything it cannot parse. A registry that serves bad data breaks
builds in repositories we will never see.

## Content hashes are recorded at install time

This is the decision the phase was scheduled early for, and it cannot be
retrofitted.

`update` needs to answer a three-way question: what does the registry have now,
what did we install, and what is on disk? Without the hash of _what we wrote_,
"the user edited this file" and "upstream changed this file" are
indistinguishable, and the only safe behaviour left is to never update anything.

So `add` records `sha256:` of every file it writes into `components.json`, from
the first release. An install that skipped this leaves no way to ever recover
the information.

Two details that matter:

- **The hash is taken after import rewriting**, because the rewritten text is
  what lands on disk. Hashing the published text would report every file as
  modified in any project that does not happen to use the `@/` prefix.
- **Line endings are normalised before hashing**, or a Windows checkout reads as
  "everything modified" and `update` becomes useless there.

## The registry URL is configurable from the first commit

`--registry` accepts an HTTPS URL **or a directory on disk**. This is not a
testing shortcut: it is how private forks and enterprise mirrors work, and it is
what lets the end-to-end tests run against a registry built in the same commit
rather than against whatever happens to be deployed.

It also means Phase 4 never depended on a live URL, and renaming the project
later changes one value in `branding.config.ts` rather than anything in the CLI.

## What the CLI refuses to do

Every one of these fails loudly rather than doing something approximate.

- **Tailwind v3** — the tokens are defined with `@theme`, which v3 cannot parse.
  Writing them anyway produces a project that does not build, and nothing points
  at the install as the cause.
- **JavaScript projects** — the published source is TypeScript. A half-working
  type-stripping transform is worse than a clear refusal, so v0.1 says so and
  the roadmap carries it as real work rather than a footnote.
- **Overwriting an edited file** — a file whose content differs from what we
  recorded has been changed by the user, which is the entire promise of a
  source-first library. `--overwrite` exists and says exactly what it will
  discard.

Because of that last rule, re-running `add` on an untouched project is a no-op,
and re-running it after the user has edited a component leaves their work alone.

## Alias rewriting

The published source imports `@/components/*` and `@/lib/*`. A project using
`~/` , or keeping components somewhere else, needs those rewritten to where the
files actually landed.

`init` reads the prefix and base directory out of the project's own tsconfig
`paths` — storing them as a prefix/base pair rather than absolute directories,
so the config survives the project being moved. Getting this wrong is the single
most common way a source-first install produces code that does not compile,
which is why it has its own unit tests separate from the end-to-end ones.

## Testing

- **Unit tests** for the pure logic: alias resolution, import rewriting, the
  three-way file comparison, registry shape and determinism.
- **End-to-end tests** against real scratch projects on disk — real
  `package.json`, `tsconfig.json` and stylesheet — with a real registry. A
  mocked filesystem would test the mock, and reading someone else's project is
  the entire job.
- **A binary test** through `tsx`, because the other tests call the command
  functions directly and leave argument parsing and the error boundary — the
  first things a user touches — unexercised.

Dependency installation is skipped in tests: spawning a package manager would
make them network-bound and slow while exercising none of our logic.

## Known gaps, carried forward

- **JavaScript output.** Needs a real TypeScript-to-JavaScript transform.
- **No `remove` command.** Deleting files the user may have edited deserves its
  own careful design rather than being tacked on here.
- **The registry is not yet hosted.** It is generated and consumed locally; the
  docs site (Phase 7) is where it gets a public URL. Naming must be settled
  before that, since the URL and CLI command are the two things that become
  expensive to change once anyone has used them.
