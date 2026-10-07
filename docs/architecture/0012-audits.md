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
every semantic pair, in light and dark, across all thirteen presets: **598 pairs**.
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

### Text on its own tint (added after 0.13.0)

The real-browser suite ([ADR 0018](0018-browser-ci.md)) found a third role the
audit never checked: status text on a tint of itself — `text-destructive` on
`bg-destructive/10`, the pill in agent status, tags, permission prompts — and
primary text on the soft button's 12% tint. In light mode these measured
4.14–4.32:1 for the status colours and 3.97–4.48:1 for primary in ten of the
thirteen presets. The text and its background move together, so neither
solid-colour pair could see it.

`audit:contrast` now checks each status colour on its own 10% tint, primary on
12%, and the soft button's hover and pressed states, over both the page and the
card: **962 pairs**. It composites the tint the way the browser paints it, on
gamma-encoded channels. The previous `composite` blended in linear light, which
reads a 10% tint as darker than it renders and would have passed every one of
these pairs by about 0.3:1 — the audit would have agreed with itself and not
with axe. Only the strongest tint that carries text is checked per colour: a
weaker tint of the same colour only reads better, and stronger status tints
(`/12`–`/15`) carry icons, not text.

In light mode all three roles — text on the page, light text on the fill, text
on the tint — improve as the colour darkens, so the band's floor at L≈0.53 was
never a contrast limit. The tint brings the ceiling down:

| Token / preset (light)         | Was   | Now   | Text on own tint       |
| ------------------------------ | ----- | ----- | ---------------------- |
| `red-500`                      | 0.577 | 0.55  | 4.14 → 4.57:1          |
| `green-500`                    | 0.53  | 0.515 | 4.31 → 4.56:1          |
| `amber-500`                    | 0.55  | 0.535 | 4.32 → 4.59:1          |
| `blue-500`                     | 0.545 | 0.525 | 4.24 → 4.57:1          |
| default `--primary`            | 0.545 | 0.54  | 4.48 → 4.57:1 (12%)    |
| `amber`                        | 0.55  | 0.53  | 4.25 → 4.59:1          |
| `blue`                         | 0.555 | 0.53  | 4.13 → 4.56:1          |
| `candy`                        | 0.58  | 0.545 | 4.03 → 4.60:1          |
| `emerald`                      | 0.53  | 0.505 | 4.13 → 4.53:1          |
| `green`                        | 0.54  | 0.51  | 4.07 → 4.55:1          |
| `indigo`                       | 0.58  | 0.55  | 4.06 → 4.57:1          |
| `ocean`                        | 0.53  | 0.505 | 4.15 → 4.56:1          |
| `orange`                       | 0.565 | 0.54  | 4.11 → 4.53:1          |
| `red`                          | 0.58  | 0.545 | 3.97 → 4.52:1          |
| `rose`, `violet`, `monochrome` | —     | —     | already 4.55:1 or more |

Each preset's `--primary-hover` and `--primary-active` moved by the same step,
so the states keep their spacing. Dark mode is untouched: every tint pair
already passes there (4.65:1 or more), and the dark primaries are pinned to
SmoothUI's brand lightness. `green-500` and `blue-500` now sit just below the
old band, at 0.515 and 0.525; both still read as their hue.

Tokens could not fix the soft button's hover (18%) and pressed (24%) states:
primary text on 24% would need every primary at L≈0.46–0.50. Those are fixed in
the component instead. The label steps to `primary-hover` — the shade that moves
away from the page in both modes — and the pressed tint is 20%, the most that
shade clears 4.5:1 on in every preset (emerald, 4.54:1). `primary-active` was
the obvious choice and is wrong: it is darker in both modes, which in dark mode
is towards the page, and it measured as low as 3.1:1 there. The onboarding
block's current-step marker moved from a 15% tint to 12%, the strength the
audit checks.

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
