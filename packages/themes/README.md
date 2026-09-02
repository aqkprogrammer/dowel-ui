<div align="center">

# @dowel-ui/themes

### Design tokens in plain CSS

[![npm](https://img.shields.io/npm/v/@dowel-ui/themes?color=5b5bd6)](https://www.npmjs.com/package/@dowel-ui/themes)
[![license](https://img.shields.io/npm/l/@dowel-ui/themes?color=5b5bd6)](https://github.com/aqkprogrammer/dowel-ui/blob/main/LICENSE)

[**Themes documentation**](https://dowel-eight.vercel.app/docs/themes)

</div>

---

The token layer behind [Dowel](https://dowel-eight.vercel.app). No config file,
no JavaScript theme object — just CSS custom properties you can read and edit.

```css
/* Brings Tailwind, the raw scales and the semantic layer. */
@import "@dowel-ui/themes/styles.css";

/* Optional — adds the seven presets. */
@import "@dowel-ui/themes/presets.css";
```

Apply a preset with `data-theme` on `<html>`; dark mode is the `dark` class.

## Two tiers, on purpose

**Raw scales** are the palette: a cool-tinted OKLCH neutral ramp, plus status
hues. **Semantic aliases** are what components actually reference —
`--primary`, `--muted-foreground`, `--destructive`.

Components never touch the raw scale. That is what makes re-skinning the system
a change to a handful of aliases rather than a search across every component
file.

```css
:root {
  --primary: oklch(0.55 0.2 275);
  --radius-scale: 1; /* one knob re-proportions every corner in the system */
}
```

## Seven presets, all contrast-audited

Default · Ocean · Emerald · Violet · Rose · Amber · Monochrome

Every preset passes **WCAG AA contrast in light and dark**, checked by an audit
that evaluates 322 colour pairs across 14 schemes on every commit. When the
audit first ran it found 88 failures — including that the amber preset could not
carry dark text on its fill at any usable lightness, so amber became an ochre.
That is a real trade, made knowingly, rather than a swatch that looks nice and
fails in use.

---

<div align="center">

[**Read the docs →**](https://dowel-eight.vercel.app/docs/themes)

MIT licensed

</div>
