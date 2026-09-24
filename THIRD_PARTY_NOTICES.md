# Third-party notices

Parts of Dowel's motion catalogue are re-implementations of components from the
MIT-licensed projects below. Each ported source file names its origin in its
first line. See `docs/architecture/0014-motion-catalogue.md`.

Items marked _original_ in a file header were designed from scratch because
their source was not available for redistribution; no code was taken from them.

## SmoothUI

- Source: https://github.com/educlopez/smoothui — https://smoothui.dev
- Copyright (c) 2024 Eduardo Calvo
- Licence: MIT
- Not ported: SmoothUI's Codrops-derived transitions (Radial Circles, SDF
  Circle, Warped Circle, SDF Blob, Organic Merge and the Shader Reveal
  family). Dowel's `shader-transition` presets for those effects are original
  shaders; none of that code was read or copied.
- Theme presets candy, indigo, blue, red, orange and green derive from
  SmoothUI's themes.

## Bencho

- Source: https://bencho.dev — https://bencho.dev/licence
- Copyright (c) 2026 Lorenzo Cabra
- Licence: MIT (the blocks). The Bencho name, logo, site, bundled photographs,
  the Maison Neue typeface and third-party logos are excluded and are not used.

## Amicro

- Source: https://github.com/Subhan-code/Amicro--Micro-transitions- —
  https://amicro.vercel.app
- Copyright (c) 2026 Syed Subhan Uddin
- Licence: MIT

## Rare UI (patterns only — no code)

- Site: https://rareui.com
- Licence: MIT with the Commons Clause and an attribution requirement, which
  forbids redistributing its components, including as ported versions. A
  registry is redistribution, so nothing from Rare UI is ported.
- Every Dowel component inspired by a Rare UI pattern — `matrix-orb`,
  `fluid-orb`, `grid-reveal`, `rail-nav`, `minimap-nav`, `scroll-progress`,
  `gooey-nav`, `duration-picker`, `folder`, `gravity-field`, `step-player`,
  `emoji-reaction`, `notification-bell`, and the additions to `code-block`,
  `otp-input`, `number-flow`, `contribution-graph`, `animated-checklist` and
  `inline-confirm` — is an _original_ implementation written from the
  published behaviour descriptions alone. Rare UI's source was not read,
  fetched or copied. No licence terms apply; the credit is given as courtesy.

---

## MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
