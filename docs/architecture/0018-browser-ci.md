# 18. Browser CI

- **Status:** Accepted
- **Date:** 2026-10-06
- **Phase:** Roadmap phase 6

## Context

Every accessibility assertion in the repository ran under jsdom, which never
lays out or paints. So `packages/ui/test/a11y.ts` switches off the two axe
rules that need a rendered page — `color-contrast` and `target-size` — and
says the browser would cover them. Nothing did. The palette audit
(`audit:contrast`, ADR 12) checks token pairs at the source, which catches a
bad token but not a component that puts a good token on the wrong surface, or
fades it with `opacity`, or draws a 16 px button.

ADR 12 deferred visual regression as high-maintenance before the API settled.
The release check that has caught the most real bugs — installing every item
into a fresh app and building it — was a manual step in RELEASING.md. And the
coverage thresholds in `packages/ui/vitest.config.ts` were configured and never
enforced.

## Accessibility: every story, in a real browser

`packages/browser-tests` runs axe in Chromium over every story in the static
Storybook build — 1,346 stories, light and dark, 2,692 page loads — with
`color-contrast` and `target-size` on. Stories are read from the build's
`index.json`, so a new story is checked the day it is written. Dark mode is the
toolbar's own global (`globals=colorMode:dark`), applied by the same decorator
a person uses, and the test waits until `<html>` actually carries it: a dark
run that silently rendered light would pass contrast on the wrong palette.

Before axe runs, the story has to be finished: Storybook's render reports
`finished` (play functions included), fonts are loaded, and every finite
animation has ended. Motion is stopped twice — `prefers-reduced-motion:
reduce`, which collapses CSS animation in `base.css`, and `--motion-scale: 0`,
which stops indicators and JavaScript reading the scale. A dialog judged a
frame early is still fading in, and fails contrast for no reason.

The page-level rules (`region`, `landmark-one-main` and the rest) stay off, as
in the jsdom harness: a story is a fragment, not a page.

It is a separate package rather than more of `screen-reader-tests`: those drive
a real screen reader, need a headed browser, take the machine over and run on
demand. These are headless and run on every pull request. The static server is
shared, not copied.

### The baseline can only shrink

The first run found **140 violations** (story, colour mode and rule) on 82
stories, which make **83 baseline entries**: 61 `color-contrast`, 9
`target-size`, and 13 across seven other rules. Not all are component bugs — a
gallery story that renders four instances side by side has four landmarks with
the same name, and four entries are one false positive, a label hidden with
`clip-path`, which axe does not understand. Exempting them silently would make
the suite pass and mean nothing; failing on all of them would block
every pull request on work this change does not do.

So `known-violations.json` lists each one — story, rule, colour modes, and a
reason a reviewer can disagree with. Real defects say `to fix: …` and name the
fix. The suite fails on any violation **not** listed, and on any entry that
**no longer occurs**. The second half is what makes it a ratchet: fixing a bug
forces its entry out, so a stale entry cannot sit there exempting the next
regression of the same rule on the same story. `pnpm a11y:baseline` folds a run
into the file — removing what is gone, adding what is new with an empty
reason — and the suite rejects an empty reason, so nothing is ever exempted
without a person writing down why.

### What jsdom could not see

Most of what the browser found is invisible without layout and paint:

- **Status text on its own tint.** `text-destructive` on `bg-destructive/10`
  is 4.14–4.47:1 in light mode, and the same for warning, info, success and
  primary. The palette audit checks status on the page background, not on the
  tint, and every soft badge in the AI components uses that pair.
- **Opacity.** Labels faded with `opacity-34`, `/45`, `opacity-60` for a quiet
  look — the only instruction on slide-to-confirm, item descriptions in
  selection-list, an enabled confirm button dimmed to 2.2:1. Token-correct
  source; unreadable result.
- **Size.** Carousel dots 16 px wide; collapsed image-accordion panels 16–21
  px; a log viewer toggle 16 px tall.

The rest (an empty table header, a `FormControl` that labels nothing when it
wraps a `Select`, tabs whose `aria-controls` name panels the story never
rendered) jsdom could have found, but only for the stories someone wrote a test
around. These run over every story.

### Where the baseline is valid

`target-size` and `color-contrast` read layout, and layout follows font
metrics: a Mac's system font is not Linux's. The baseline is generated in the
same Playwright container CI uses (`test:a11y:docker`). Here the macOS and
container runs found exactly the same 140, but nothing guarantees that for
the next font release, so the container is the one that is authoritative.

### What it costs, and what was observed locally

With the baseline in place the full suite passes on an M-series Mac in 4.8
minutes (2,693 tests, none failing); the first run, with every violation
still failing and Playwright restarting a worker after each, took 11. In the
container on the same machine, with Docker shared by other workloads, it took 35 minutes the
first time and 72 the second, and the second run had 25 timeouts — every one a
page or axe call that did not finish in the budget, none a changed result; 24
of them passed when rerun. The slowest story, `uptime-matrix`, rendered and
was checked in 3.3 s on macOS and 80 s in that container. Hence a 120-second
per-story budget (a budget, not a retry — retries stay at zero) and three
shards in CI. How long it takes on a GitHub runner has not been measured yet.

## Visual regression: a curated subset, in a pinned container

Screenshots of **42 stories** — foundations, the form controls, seven overlays
captured open, tables and code, feedback, the AI primitives, and five blocks —
in light and dark, left-to-right and right-to-left, at 1280×800, with the
blocks again at 390 px wide: 188 images.

**Why a subset.** Most of the catalogue is motion, canvas and effects whose
picture is one frame of something moving. A baseline per story per mode per
direction would be over five thousand images, regenerated wholesale whenever a
token moves, and reviewed by nobody. These are the surfaces where a regression
hurts and a reviewer can tell at a glance whether a change is intended.

**Why the container.** Font rendering differs between operating systems, and
Skia can take different SIMD paths on arm64 and x86-64, which can move
anti-aliased edges by a shade. Baselines are written and compared only in the official
Playwright image whose tag matches the installed `@playwright/test`, forced to
`linux/amd64` like GitHub's runners. The suite refuses to run anywhere else, so
a baseline written on a Mac cannot be committed by accident.

**Deterministic by construction, not by tolerance.** Reduced motion and
`--motion-scale: 0`, Playwright's animation and caret freezing, a fixed clock
(a calendar shows the same month every day), a seeded `Math.random`, and no
network beyond the local Storybook — a story that fetches from outside fails
rather than photographing whatever the internet returned. With all that, the
comparison allows zero differing pixels. If it ever needs a tolerance, that is a
determinism bug to find.

RTL needed one change to Storybook: a `direction` toolbar global that sets
`dir` on `<html>` **and** wraps the story in `DirectionProvider`. With only the
first, Radix menus and selects stay left-to-right and the screenshot shows a bug
no real app has.

The committed baselines were written with `test:visual:update` in that
container, under x86-64 emulation on Apple silicon, and a second run matched
all 188 with zero differing pixels. Emulation should draw what a native runner
draws, but that is the one thing not yet observed: if the first CI run
disagrees, the `Browser` workflow's manual dispatch (`update-snapshots`)
rewrites them on a runner and uploads them as an artifact for a person to look
at and commit — the same path every later baseline change takes.

## Coverage

The thresholds are now enforced: CI runs the component suite once, with
coverage, instead of a plain run plus a coverage run. Measured on this change:
statements 97.3%, branches 93.4%, functions 97.5%, lines 98.7% — well over the
configured 85/80/85/85, so the floors stay where they were rather than being
raised to whatever today's number happens to be.

## The install check

`scripts/smoke/install-all.mjs` does what RELEASING.md describes by hand:
scaffolds with the local `create-dowel-app`, then the local CLI and the local
registry `init` and `add` every free component and block, then `tsc --noEmit`
and `next build`. It also writes a page importing every installed module,
because `next build` only compiles what something imports — a component nothing
imports is a component whose `"use client"` is never checked. Dependency-free,
like `binaries.mjs`.

Locally it installed 291 items (354 files) and built in 9 minutes, two of them
`npm install`. That is short enough to run on every pull request, in parallel
with `verify`, rather than only on `main`: it is the check most likely to catch
what nothing else does, and catching it before merge is the point.

## What the screenshots found before they were baselines

The calendar's month navigation is `absolute inset-x-3 top-3` inside a root
that is not positioned, so it anchors to whatever ancestor is: in Storybook the
viewport, with the chevrons at the window's edges. Nothing that does not paint
could have noticed. The baseline records it as it is; the fix (`relative` on
the calendar root) is component work and will change those four images.

## Not done

- **Overlays are checked by axe closed.** The visual suite opens seven; the axe
  suite opens none, so the content of a dialog or menu is only covered where a
  story renders it open.
- **One theme preset.** Thirteen presets are audited at the token level; the
  browser suites run the default.
- **The baseline's `to fix` entries** are reported, not fixed. Fixing them is
  component work, and each fix shrinks the file.
