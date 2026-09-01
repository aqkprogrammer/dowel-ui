# 5. Building Drawer and Toast in-house

- **Status:** Accepted
- **Date:** 2026-08-31
- **Phase:** 2

## Context

Two Phase 2 components had an obvious third-party answer, and both were checked
against the registry before being adopted rather than after.

**Drawer.** `vaul` is the standard choice. Its last release is `1.1.2`,
published **2024-12-14** — twenty months before this decision. It declares a
React 19 peer but has shipped nothing since React 19 became stable.

**Toast.** `sonner` is the standard choice and is genuinely healthy: `2.0.8`
was published three weeks ago, with React 19 support.

## Decision

**Both are built in-house on Radix primitives.**

### Drawer

Radix Dialog supplies the modal semantics; the drag-to-dismiss gesture is ours,
in about 60 lines of pointer handling. A foundation component should not sit on
a package that has been unmaintained for twenty months, and the alternative —
shipping a Drawer that is a Sheet with a different name — would be worse.

Deliberately narrow in this version: bottom-anchored only, no snap points. A
drawer entering from the side without a gesture _is_ a Sheet, and two components
differing only in name is worse than one. Snap points can be added without an
API break if they turn out to be wanted.

### Toast

The reason to build here is different: `sonner` is fine software, but the whole
premise of this library is that consumers own the source. Shipping a component
whose behaviour lives in someone else's package contradicts that for one of the
most commonly customised surfaces in an application.

Radix Toast supplies the parts that are genuinely hard and easy to get wrong —
the live region and its politeness, timers that pause on hover, focus and window
blur, swipe-to-dismiss, and the F8 hotkey that moves focus into the toast list.
What it does not supply is the imperative API, which is the actual developer
experience people want from `sonner`. That is a module-level store plus
`useSyncExternalStore`, about 150 lines, and it is the reason `toast()` is
callable from a fetch handler with no hook and no provider lookup.

## Consequences

- Zero new runtime dependencies in Phase 2. The whole phase adds only
  `radix-ui`, which Phase 1 already had.
- We own two gesture/timing surfaces we would otherwise have rented. Both are
  covered by tests, including the drag thresholds.
- **Re-evaluate at Phase 9.** If snap points or multi-directional drawers turn
  out to matter, that is a real feature gap, and `vaul`'s maintenance status
  should be re-checked rather than assumed to be unchanged.

## Two bugs this phase's tests caught

Recorded because both are the kind that ship silently.

1. **`asChild` was broken on any Button that could load.** Adding the spinner
   gave Radix `Slot` two children. Fixed with `Slot.Slottable`. (Phase 1, found
   while writing Phase 1 tests — noted here because the same trap applies to
   every component that injects children.)
2. **A toast set to `duration: Infinity` dismissed itself after ~1ms.**
   `Infinity` was mapped to `Number.MAX_SAFE_INTEGER`, but `setTimeout` takes a
   32-bit signed integer and silently overflows. Now clamped to 2³¹−1 ms. The
   symptom — a persistent toast doing the exact opposite of persisting — would
   have been baffling to debug from a bug report.
