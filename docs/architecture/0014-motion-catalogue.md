# 14. The motion catalogue

- **Status:** Accepted
- **Date:** 2026-09-18
- **Phase:** 11

## Context

Until now Dowel animated almost nothing: overlays entering and leaving, a
spinner, a streaming caret. Every keyframe lived in the theme, and there was no
animation library.

The expansion in `docs/plans/component-expansion.md` adds several hundred
animated behaviours — loaders, button micro-interactions, text effects, card
spreads, canvas charts, gesture-driven controls — ported from three MIT
libraries (SmoothUI, bencho, amicro). Three questions had to be settled before
the first one landed, because each answer is multiplied by four hundred.

## Keyframes ship with the component

The theme is installed once. Every keyframe added to it is a keyframe every
project carries whether or not it uses the loader, and a component installed
into a project with an older theme animates nothing and fails nowhere.

So a new component declares its own keyframes, rendered through React 19's
hoisted stylesheet:

```tsx
<style href="dowel-dots-loader" precedence="dowel">
  {keyframes}
</style>
```

React hoists it into `<head>` and de-duplicates by `href`, so a hundred loaders
on one page emit one stylesheet. It installs with the component, is removed with
it, and needs no theme migration.

Two rules keep this from undoing ADR 0002:

- Keyframe names are prefixed `dowel-<component>-` so two components can never
  collide.
- Durations inside those strings derive from the scale —
  `calc(1.2s * var(--motion-scale-indicator))` for indicators,
  `calc(600ms * var(--motion-scale))` or a `--duration-*` token for everything
  else — and colours are `var(--color-*)` or `currentColor`. `audit:tokens`
  already scans the whole file, strings included.

The existing theme keyframes stay where they are; nothing moves.

## CSS first, `motion` where CSS cannot

Most of the catalogue is a keyframe or a transition. That is the default.
The `motion` package is used only when the behaviour is one CSS cannot express
honestly:

- a spring that must carry velocity from a gesture (drag, flick, pull),
- a shared-layout animation between two DOM positions,
- a value that follows the pointer continuously with physics.

It is a per-component dependency, declared in `meta.dependencies` like any
other, so a project that installs a CSS loader never installs it.

Components that use `motion` wrap their tree in
`<MotionConfig reducedMotion="user">`. The global blanket in `base.css` stops
CSS animation under reduced motion but cannot reach a JavaScript spring;
`MotionConfig` is what makes the same promise hold for those.

## Families, not copies

A source that ships twenty buttons whose only difference is the pair of icons
they morph between has one mechanism, not twenty. Dowel ships the mechanism
once, with a variant axis, and every source item becomes a value of that axis
and a story. The alternative — twenty components, twenty test files, twenty
registry entries that must all be fixed when the mechanism has a bug — is the
drift the audits exist to prevent.

Where a source item duplicates a component Dowel already has (tabs, checkbox,
pagination), its motion is added to that component without changing its API.
Two components for one job is a decision every user has to make forever.

## Loaders are indicators

`data-motion="indicator"` exempts an element from the reduced-motion blanket and
slows it instead. ADR 0012 set the bar: the animation must report ongoing state.
Every loader family meets it for the same reason the spinner does — a frozen
loader says the application has hung — and each is added to
`ALLOWED_INDICATORS` with that reason. Nothing else in the catalogue qualifies:
a shimmering headline or a card that fans out is decoration, and stops.

## Provenance

Every ported file starts with a one-line comment naming its source, and
`THIRD_PARTY_NOTICES.md` carries the MIT notices. Items whose source licence
does not allow redistribution — bencho's paid blocks, Codrops-derived shaders,
photographs — are designed from scratch instead, and are marked as such.
