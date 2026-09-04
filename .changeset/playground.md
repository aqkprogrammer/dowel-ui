---
"@dowel-ui/docs": minor
---

Add the playground, and fix two things it uncovered.

`/playground` renders any component with live controls, a theme preset, dark
mode and the radius scale, and generates the JSX for what is on screen. Every
control is derived — variant axes are read from each component's own `cva()`
call at build time, and the rest from the `argTypes` its stories already
declare — so a control cannot offer a value the component does not implement.

Two pre-existing bugs surfaced while building it, both affecting every
component page:

- **Stories were ordered alphabetically, not as written.** A module namespace
  object sorts its own keys, so `Object.keys` never returned source order and
  Button's page opened on "As Link". Order is now recorded at build time.
- **34 stories were invisible**, including the `Default` example on 25
  component pages. `asStory` required a `render` or `args`, which the canonical
  `export const Default: Story = {}` has neither of.
