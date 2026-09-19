import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "logo-marquee",
  kind: "block",
  title: "Logo marquee",
  description:
    "A heading over a quiet, dimmed marquee of logos with a named speed, a direction and a pause control.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button", "marquee"],
  files: ["logo-marquee.tsx"],
  a11y:
    "One section landmark named by its heading (level set with `headingLevel`). Built on " +
    "Marquee: each logo exists once for assistive technology and the keyboard, the row pauses " +
    "on hover and focus, runs mirrored on right-to-left pages, and stops under reduced motion. " +
    "A visible Pause button stops it outright (WCAG 2.2.2). Each entry is named by its " +
    "organisation; the graphic is aria-hidden, and focus brightens an entry as hover does.",
});
