# 12. Audits

- **Status:** Accepted
- **Date:** 2026-09-01
- **Phase:** 9

## Context

Everything up to here was checked per component, by tests written alongside it.
That leaves two gaps: properties that only exist across the whole set
(consistency), and properties no test environment can observe (contrast).

The audits are scripts rather than a checklist, because a checklist is a thing
someone did once and a script is a thing that keeps being true. They run in CI.

## Colour contrast

The per-component accessibility assertions run in an environment that never
lays out or paints, so `color-contrast` is disabled there — as it must be, since
it cannot produce a meaningful answer. That leaves the palette unchecked, which
is where contrast problems actually live.

`audit:contrast` converts the OKLCH tokens to sRGB and computes WCAG ratios for
every semantic pair, in light and dark, across all seven presets: **322 pairs**.
The conversion has its own tests, because an audit that quietly computes the
wrong numbers is worse than none.

**It found 88 failures.** Not edge cases — the palette's status colours, its
secondary text and its input borders.

### What that revealed about the palette

The interesting finding was structural. A status colour does two jobs: it is
text on the page background, and it is a solid fill with light text on it. Those
pull in opposite directions, and the naive fix is a second token per status.

Solving it numerically showed a narrow band where a single value clears 4.5:1
in _both_ roles — around L=0.53–0.58 for these hues. So the fix was to move four
values into that band rather than to double the token count:

| Token         | Was     | Now     | Why                                     |
| ------------- | ------- | ------- | --------------------------------------- |
| `green-500`   | L 0.588 | L 0.53  | 3.89:1 as text; 3.73:1 as a fill        |
| `blue-500`    | L 0.600 | L 0.545 | 3.88:1 as text                          |
| `amber-500`   | L 0.760 | L 0.55  | **2.19:1** as text — the worst offender |
| `neutral-500` | L 0.566 | L 0.532 | secondary text was 4.14:1 on `muted`    |

Amber moving from 0.760 to 0.55 also flipped `--warning-foreground` from dark to
light. A bright amber cannot be read as text on white — it tops out near 2.4:1 —
so "amber" here is an ochre. That is a real aesthetic cost, accepted knowingly.

The `amber` _preset_ had the same problem twice over: its primary is also the
focus ring, which has its own 3:1 floor, and it was at 2.42:1.

### Input borders

`--input` was at 1.46:1. The input's background matches the page, so its border
is the only thing identifying it as a field — WCAG 1.4.11 applies, and 3:1 is
required. Now 0.66 in light and 0.48 in dark. Noticeably heavier than fashion
would suggest, and correct.

### What is advisory, and why

`--border` and `--border-strong` fail 3:1 and are reported without failing the
build. WCAG 1.4.11 covers what is needed to _identify_ a component or its state;
a divider or a card outline is structural decoration, and the content inside is
distinguishable without it. Holding those to 3:1 would put heavy rules
everywhere in the name of a rule that does not apply.

This distinction is in the script, next to the pairs it applies to, so the
judgement is reviewable rather than implied by what the script happens to check.

## Token usage

`audit:tokens` fails on any raw colour scale or literal colour in component
source. A component that reaches past the semantic layer stops responding to
themes, and that is invisible until someone switches preset and one thing stays
the wrong colour. 54 files, clean.

Stories and tests are exempt: they are examples, and are never installed.

## API consistency

`audit:api` applies seven rules to every component and block at once, so
consistency does not depend on remembering. It found two:

- **`toolVariants` was not exported**, unlike every other cva component.
- **A prop shadowing a native attribute** — which turned out to be a false
  positive worth keeping. The first version flagged Pagination's `size`, but
  `size` is only an attribute on form controls; on an anchor it shadows nothing.
  The rule now flags `role` always, since it is _global_, and the form-control
  attributes only where the component actually extends one. That is exactly the
  distinction that forced `Message`'s prop to be `from` and Input's to be
  `inputSize`.

A rule that is right for the wrong reason is worse than no rule, because it
teaches the wrong lesson to whoever reads it next.

## Bundle

`audit:bundle` reports what a consumer receives: source size per registry entry,
gzipped size, and the npm packages any of it can ask them to install. 56
entries, 285 kB of source, largest single entry 15.6 kB.

There is a per-entry source budget, because an outsized single file is a
component that wants splitting rather than a number to watch drift upward.

The build emits one module per component, which is the evidence for
tree-shaking rather than a claim about it.

## Also in this phase

**`remove`**, the last missing CLI command. Deleting is the one irreversible
thing the CLI does, so it distinguishes a file still exactly as installed from
one that has been edited — the latter is kept unless forced. It also refuses to
remove a component another installed component still imports, which required
`add` to start recording dependency edges so the check works offline.

## Not done

- **JavaScript output.** Still needs a real TypeScript-to-JavaScript transform.
  A half-working one remains worse than a clear refusal.
- **Visual regression testing.** High value at scale, high maintenance before
  the API settles. The contrast audit covers the failure mode that actually
  matters for accessibility; the rest is judgement.
- **A props playground.** The story switcher on each documentation page covers
  most of it.
- **Deployment.** The site builds and serves the registry; choosing a host and a
  domain is a naming decision.
