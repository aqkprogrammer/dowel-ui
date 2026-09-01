# 4. Component conventions

- **Status:** Accepted
- **Date:** 2026-08-31
- **Phase:** 1

Rules every component in `packages/ui/src/components` follows. They exist so the
system stays coherent as it grows to ~90 components, and so a developer reading
any component's source can predict the next one.

## Structure

One directory per component, named in kebab-case, matching the registry name:

```
button/
├── button.tsx          component + cva variants, both exported
├── button.test.tsx     behavioural tests
├── button.stories.tsx  Storybook
├── index.ts            public surface
└── meta.ts             registry metadata (see ADR 3)
```

Multi-part components (Card, Alert, Avatar) stay in one file and export a
compound set until the file exceeds roughly 250 lines.

## API

- **Props extend `ComponentPropsWithRef<E>`** and spread `...props` onto the
  root, so any native attribute works. React 19 passes `ref` as a prop; no
  `forwardRef` wrapper.
- **`className` always runs through `cn()`**, so consumers override any utility
  without `!important`. Every component has a test proving a conflicting
  override wins.
- **Variants use `cva`**, and `xVariants` is exported alongside the component so
  blocks and other components can reuse the same styles.
- **`asChild`** (Radix `Slot`) on anything that could reasonably be a link. If a
  component injects children of its own (a spinner, an icon), wrap the consumer's
  children in `Slot.Slottable` — otherwise `asChild` breaks the moment the extra
  child appears.
- **Never shadow a native attribute with a different meaning.** Input's size
  variant is `inputSize`, because `size` already means something on `<input>`.
- Interaction state comes from `@/lib/styles` (`focusRing`, `disabledStyles`,
  `invalidStyles`, `iconSlot`) rather than being retyped per component.

## Overlays

- **Portal by default.** Every floating surface renders through a portal so it
  escapes `overflow: hidden` and stacking contexts. Layering is governed by the
  `--z-*` scale, never by ad-hoc numbers.
- **Motion is composed from two shared keyframe pairs, not one per direction.**
  Floating surfaces (`popover`, `dropdown`, `tooltip`) grow from
  `transform-origin`, which the primitive computes, so one animation covers all
  twelve side/align combinations. Edge-anchored panels (`sheet`, `drawer`,
  `toast`) take their travel from `--slide-x` / `--slide-y`, set per side by a
  cva variant, so four sides share one animation pair.
- **Exits are faster than entrances.** An opening surface is information
  arriving; a closing one is the user already moving on.
- **A gesture is never the only way out.** Drawer's drag has Escape, the overlay
  and an explicit cancel alongside it.

## Forms

- **Error state is a prop, not a subscription.** `FormField` takes `error` from
  wherever the state lives. Nothing in the library imports a form library.
- **Never name an element that was not rendered.** `aria-describedby` is
  assembled from the description and message that actually exist; a dangling
  reference announces nothing and axe flags it.
- **Put the name where the role is.** Slider's `aria-label` has to reach the
  thumb, because the thumb is the `role="slider"` element. Check where the role
  actually lands before assuming a prop on the root is enough.
- **Warn in development for invisible accessibility defects.** `PopoverContent`
  and `Slider` both warn when an accessible name is missing — these are mistakes
  that look perfect on screen and are serious for screen reader users, so they
  are surfaced where they are introduced rather than left for an audit.

## Accessibility

- Error state is driven by **native `aria-invalid`**, not a bespoke prop, so
  form libraries wire it up with no adapter.
- **Live regions are opt-in.** `Alert` defaults to `live="off"`: a live region
  that exists on first paint announces for no reason and trains users to ignore
  it.
- **Transient busy states do not use `disabled`.** A loading `Button` sets
  `aria-disabled` + `aria-busy` and guards its click handler, so focus is not
  stranded mid-action. Genuinely inert controls still use `disabled`.
- **Decorative by default where it is decorative.** `Separator` is
  `decorative`; `Skeleton` and `Spinner` are `aria-hidden` unless given a label.
- Colour is never the only signal. The `monochrome` preset exists partly as a
  standing test of this.

## Testing

Behavioural, never snapshots. Each component covers: rendering, every variant
and size, `className` override winning a conflict, ref forwarding, prop
forwarding, keyboard interaction, disabled and loading behaviour, controlled and
uncontrolled modes where applicable, and an axe pass via
`expectNoA11yViolations`.

Coverage thresholds are enforced in `vitest.config.ts` (85% statements, lines
and functions; 80% branches). Phase 1 shipped at 100% on all four; Phase 2 at
98.8% statements and 88.6% branches.

Overlay tests must additionally cover: opening from pointer **and** keyboard,
Escape dismissal, focus restoration to the trigger, and an axe pass taken from
`baseElement` rather than `container`, since portalled content renders outside
it.

## Two things that will bite you

**jsdom cannot measure.** Anything depending on real geometry — collision-aware
placement, Tooltip's hover grace area, a drawer's height — is stubbed in
`test/jsdom-polyfills.ts` or explicitly disabled in the test. Do not write an
assertion that silently exercises the stub; either disable the geometry-dependent
behaviour for the test and say why, or leave it to a real browser.

**Do not guess at a primitive's DOM.** Radix's rendered output is frequently not
what it looks like from the outside — a Toast `<li>` carries no role, and its
announcement happens in a separate live region where an action's `altText`
replaces the visible label. Render it and read the DOM before writing the
assertion.

**Re-exported primitives break declaration emit.** `export const Dialog =
DialogPrimitive.Root` cannot have its props type named from our paths, so
`satisfies Meta<typeof Dialog>` fails with TS2883. Annotate the meta explicitly
(`const meta: Meta<typeof Dialog> = {...}`) in those story files.
