import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "logo-links-marquee",
  kind: "block",
  title: "Logo links marquee",
  description:
    "A heading over an endless row of large, linked logos that pop in one after another and tilt on hover, with a pause control.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button", "marquee"],
  files: ["logo-links-marquee.tsx"],
  a11y:
    "One section landmark named by its heading (level set with `headingLevel`). The row is " +
    "Marquee, so each logo link exists once for assistive technology and the keyboard — the " +
    "copies that close the loop are aria-hidden and inert — and it pauses on hover and focus. " +
    "A visible Pause button stops it outright (WCAG 2.2.2); under reduced motion the row stops " +
    "and becomes a scrollable region, and the button is hidden because there is nothing to " +
    "pause. Each entry is named by its organisation; the graphic is aria-hidden.",
});
