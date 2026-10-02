# Plan: hardening after 0.11.0

**Status:** in progress (2026-10-02)

## Goal

0.11.0 has 220 components. What is missing is around them: checks that catch
what a user would hit, a release that does not depend on someone typing a
code in time, and proof that the headline feature works. No new components in
this round.

## What prompted it

Two releases each shipped, or nearly shipped, a bug that every test here
passed: 22 components that did not build once installed, and one that a new
Next.js app's ES2017 target rejected. Both were found by installing into a
fresh app by hand. And "agents can operate your UI and hand it back" had only
scripted stories behind it.

## Work

| #   | Item                                 | Status  | Where                             |
| --- | ------------------------------------ | ------- | --------------------------------- |
| 1   | Install check in CI                  | done    | aqkprogrammer/dowel-ui#13         |
| 2   | Releases from a tag, no login prompt | done    | aqkprogrammer/dowel-ui#13         |
| 3   | Visual regression tests              | done    | aqkprogrammer/dowel-ui#15         |
| 4   | Live agent demo                      | done    | aqkprogrammer/dowel-ui#14         |
| 5   | Screen reader tests for 0.11.0       | next    |                                   |
| 6   | Locale-stable numbers in the charts  | next    |                                   |
| 7   | A written path from beta to stable   | next    |                                   |
| 8   | Labels for every hard-coded string   | later   |                                   |
| 9   | Installs checked beyond Next.js      | later   |                                   |
| —   | A domain the registry URL can keep   | owner's | the URL is compiled into each CLI |
| —   | Selling the Pro tier                 | owner's | Polar product and three variables |

### 1. Install check in CI

`pnpm install-check` builds the registry from the checkout, creates a Next.js
app, adds every registry item with the checkout's CLI and builds it. On pull
requests that touch the library, and nightly against the newest
`create-next-app`. Its first full run found a third bug of the same family:
three carousels shipping different files under one name.

### 2. Releases from a tag

Pushing `vX.Y.Z` checks that the live registry already serves that version,
packs, and publishes with npm's trusted publishing. The job with publishing
rights installs nothing. One-time setup on npmjs.com is in `RELEASING.md`.

### 3. Visual regression tests

No stored baselines: the pull request's Storybook is compared with its base
branch's, so there is nothing to keep in git and no operating-system
differences to explain. A label passes an intended change.

### 4. Live agent demo

`/agent-demo`: a model operates a deals page through the tools the page
registered, and the visitor takes it back mid-run. One narrow endpoint, off
until a key is set, scripted otherwise. See `RELEASING.md` for what bounds
the cost.

Using it by hand found three bugs in `agent-surface` that no unit test could
see, the worst being that the click that took control was thrown away. jsdom
cannot reproduce it, which is why there is now a `browser` Playwright project.

### 5 to 9

- **Screen readers.** VoiceOver and NVDA scenarios exist for
  `stream-announcer` only. The 0.11.0 components where speech is the point:
  `chart-sonifier`'s slider, `expression-editor`'s suggestions,
  `permission-prompt`'s announcement, `nl-filter`'s "Added 2 filters".
- **Locale.** The dither charts and `chart-sonifier` write numbers in the
  runtime's locale, so a server render and a German browser disagree.
  `quantity-input` already has the fix to copy.
- **Beta to stable.** 139 of 220 components are `beta`, and only
  `stream-announcer` has written criteria for leaving. Define them once, per
  component kind, and promote in batches.
- **Labels.** 13 components take a `labels` prop; about 31 `aria-label`s are
  English in the source.
- **Other frameworks.** The install check covers Next.js. Vite is documented
  and unchecked.

## Found on the way, not yet fixed

- **Loaders freeze under reduced motion.** Their docs say they slow down
  rather than stop, but the blanket reduced-motion rule in the themes'
  `base.css` still matches their animated parts.
- **`ai-conversation` races on first paint.** A long transcript opens at the
  top on some loads and at the latest message on others. It is the one story
  the visual tests exclude.
- **Twelve components write numbers or dates in the runtime's locale,** not
  only the charts: item 6 is wider than its name.

## Not in this round

New components. React 18 support: the package requires 19, on purpose
(`ref` as a prop).
