# 2. Two-tier design tokens in OKLCH

- **Status:** Accepted
- **Date:** 2026-08-31
- **Phase:** 1

## Context

Tailwind v4 moves theme definition out of `tailwind.config.js` and into CSS via
`@theme`. Components need to be re-skinnable by consumers without editing the
component source, since in a source-first library that source lives in the
consumer's repository and every local edit they make is a future merge conflict.

## Decision

**Two tiers.**

- _Tier 1_ (`packages/themes/src/tokens.css`) — raw scales that never change
  between light and dark: neutral and status ramps, radius ladder, type scale,
  elevation, motion. Declared in `@theme`.
- _Tier 2_ (`packages/themes/src/base.css`) — semantic aliases (`--primary`,
  `--border`, `--ring`, …) defined on `:root` and `.dark`, then mapped into
  Tailwind's colour namespace with `@theme inline`.

**Components reference Tier 2 only.** The `inline` keyword is what makes a
single utility class work in both modes: the generated utility resolves through
`var()` at use time instead of baking in the light-mode value.

**OKLCH for all colours**, because perceptually even lightness ramps make theme
presets generable rather than hand-tuned, and make contrast auditing tractable.

**Dark mode is class-based** (`.dark` on `<html>`, via `@custom-variant`), so
system/light/dark can be a user preference rather than only an OS one.

## Notable choices

- **15px base font size** (`--text-base: 0.9375rem`). This is an application UI
  system; 15px is the density product surfaces want. Marketing pages step up to
  `--text-lg` for body copy.
- **A single `--radius-scale` multiplier.** Every radius token is
  `calc(<base> * var(--radius-scale, 1))`, so one custom property re-proportions
  every corner in the system. This is the knob the theme editor and the CLI
  expose, instead of asking consumers to override eight tokens.
- **Themeable `--shadow-color`.** Shadows tint with the surface rather than
  muddying it with pure black.
- **`prefers-reduced-motion` is handled once**, globally, in the base layer.
  Components do not re-implement it.

## Consequences

- A theme preset only reassigns the brand-carrying tokens (six lines of CSS).
  All six presets plus monochrome were verified present in built output, in both
  light and dark form.
- `tailwind-merge` must be told about scales we add beyond Tailwind's defaults,
  or class conflict resolution silently breaks. `text-2xs` is registered in
  `cn()`; **any future custom scale must be registered there too**, with a test.
