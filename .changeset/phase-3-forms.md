---
"@dowel/ui": minor
---

Add the form layer: Checkbox, Radio Group, Switch, Slider, Select, Form,
Combobox, Calendar and Date Picker.

Combobox implements the ARIA combobox pattern directly rather than depending on
`cmdk`, and Form wires field accessibility without binding to any form library —
pass `error` from `useState`, React Hook Form or a server action and the markup
is the same. Calendar adds `react-day-picker`, the phase's only new dependency.

Slider now forwards its accessible name onto the thumbs, where the
`role="slider"` actually is, and accepts `thumbLabels` / `thumbValueTexts` to
name each thumb of a range slider separately.
