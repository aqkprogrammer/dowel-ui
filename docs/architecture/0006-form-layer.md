# 6. The form layer: one dependency, two things built in-house

- **Status:** Accepted
- **Date:** 2026-08-31
- **Phase:** 3

## Context

Phase 3 had three components where the obvious answer was a third-party package.
Each was checked against the registry before adoption, following ADR 5.

| Package                   | Last published           | Verdict                           |
| ------------------------- | ------------------------ | --------------------------------- |
| `react-day-picker@10.0.1` | 2026-05-15 (3.5 months)  | **Adopted**                       |
| `cmdk@1.1.1`              | 2025-03-14 (17.5 months) | Rejected — build in-house         |
| React Hook Form           | healthy                  | Rejected — for a different reason |

## Decision

### Calendar depends on `react-day-picker`

The one dependency this phase adds. A calendar needs locale-aware week layout,
a roving-focus grid keyboard model, range selection with an incomplete
intermediate state, out-of-month handling and timezone-safe date maths. That is
a library, not a component, and `react-day-picker` is actively maintained.

`Calendar` is therefore a **design layer**, not a reimplementation: every class
comes from our tokens, so it re-skins with the rest of the system instead of
shipping its own visual language. It brings `date-fns` transitively — the only
place in the library where a date library is unavoidable.

### Combobox is built in-house

`cmdk` is 17.5 months without a release, which is the same situation that ruled
out `vaul` in ADR 5. For one of the most-used components in any product UI, that
is not a foundation to build on.

The ARIA combobox pattern is well specified, so this is roughly 200 lines: the
input owns `role="combobox"` with `aria-activedescendant`, the list owns
`role="listbox"`, and focus never leaves the input while typing.

One implementation note worth keeping: **navigation reads the rendered options
from the DOM rather than from a registry.** A registry of items has to be kept
in sync with what filtering has actually left on screen, and it drifts. Querying
`[role="option"]:not([data-disabled])` in DOM order is always correct by
construction.

Single-select and flat in this version. Multi-select and grouping fit the same
API without a break.

### Form is not bound to a form library

React Hook Form is healthy and widely used, and it is still the wrong
dependency here.

What is genuinely hard about a form field is the ARIA plumbing — generating an
id, pointing the label at the control, assembling `aria-describedby` from
whichever of the description and error actually exist, flipping `aria-invalid`.
That plumbing is **identical** whether the state comes from `useState`, React
Hook Form, Formik, or a server action.

Coupling to one library would force everyone else to install it just to get the
plumbing, and would make the source the user owns harder to change. So
`FormField` takes an `error` prop from wherever the state lives, and the markup
is the same in every case.

The subtle part is `aria-describedby`: it must not name an element that was
never rendered. A dangling reference announces nothing and is flagged by axe, so
`FormDescription` registers its presence rather than being assumed.

## A lint rule configured, not disabled

`jsx-a11y/no-autofocus` fires on any prop spelled `autoFocus`, including
`react-day-picker`'s — which asks the calendar grid to focus its selected day
when it mounts _inside an already-opened popover_. That is correct focus
management, not page-load autofocus.

The rule is now configured with `ignoreNonDOM: true`, which is the option
provided for exactly this case. DOM `autoFocus` remains an error.

## Two bugs the tests caught

Both are the kind that look fine on screen and fail for screen reader users.

1. **`<Slider aria-label="Volume">` produced an unnamed slider.** The label
   landed on the root, but the _thumb_ is the element with `role="slider"`.
   Naming attributes are now forwarded onto the thumbs, `thumbLabels` and
   `thumbValueTexts` name each thumb of a range slider separately, and a
   development warning fires if a thumb would be unnamed.
2. **A date picker with a date already selected opened on today's month.**
   `react-day-picker` does not infer the displayed month from `selected`, so
   editing a date from last year dropped the user in the wrong place with no
   indication why. `defaultMonth` is now derived from the value.
