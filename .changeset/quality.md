---
"@dowel-ui/docs": minor
---

Add per-component quality, measured rather than asserted.

Every component and block is checked at build time against the rules
`audit:api` and `audit:tokens` already enforce — tests, axe assertion, keyboard
coverage, semantic tokens, motion tokens, `cn()` merging, visible focus, no
fixed widths — reading its own source and test file. The checklist appears on
each component page, and `/quality` shows the whole matrix.

Checks that do not apply are recorded as such and left out of the score, so the
denominator means something: a Separator has no focus ring because it is not
interactive, which is a fact about Separator rather than a mark against it.

The result is 99% across 78 items, with 68 perfect and 10 carrying one gap
each — every one of those an interactive component tested by click but never by
keyboard. The page exists to show that rather than round it away.
