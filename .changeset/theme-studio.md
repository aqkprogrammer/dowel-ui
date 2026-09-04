---
"@dowel-ui/themes": minor
"@dowel-ui/docs": minor
---

Add the Theme Studio, and move the colour maths into the themes package.

`/theme-studio` builds a preset from one colour: it derives the hover, active
and dark-mode values from the same relationships the shipped presets use, picks
readable text for the result, and reports the contrast of all six states live.

The check is not a second implementation. `oklch → sRGB` and the WCAG ratio now
live in `@dowel-ui/themes` and are re-exported to the audit that gates CI, so a
colour the studio passes is one the build passes. `derivePreset`,
`checkPreset` and `formatPreset` are exported too — the export is the same file
format as `presets/*.css`, so it drops into a fork unchanged and is covered by
the same audit as everything else.

Also adds `hexToOklch`, `oklchToHex`, `formatOklch`, `encodeSrgb` and
`decodeSrgb`, and gives the themes package a test suite of its own.
