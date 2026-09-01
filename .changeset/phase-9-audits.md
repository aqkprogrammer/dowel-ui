---
"@dowel/themes": minor
"@dowel/cli": minor
---

Fix colour contrast across the palette, and add the `remove` command.

A new contrast audit converts the OKLCH tokens to sRGB and checks all 322
semantic pairs across both modes and all seven presets. It found 88 failures.
Four token values moved — success, info, warning and the neutral used for
secondary text — and input borders were darkened to meet the 3:1 required to
identify a form control. `--warning-foreground` is now light, because an amber
readable as text on white is an ochre.

`remove` deletes installed components, keeping any file you have edited unless
forced, and refuses to remove a component another installed component still
imports.
