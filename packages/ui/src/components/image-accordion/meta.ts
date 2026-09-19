import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "image-accordion",
  title: "Image Accordion",
  description:
    "Image panels in a row — the open one widens and shows its caption, the rest stand as narrow strips — opened by hover, focus or press.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["image-accordion.tsx"],
  a11y:
    "An APG accordion: each panel's header is a button with aria-expanded inside a heading (`headingLevel`), " +
    "controlling its caption, which is aria-hidden and inert while closed. Exactly one panel is open. " +
    'Arrow keys move between headers (Left/Right mirrored under dir="rtl", Up/Down when vertical), Home ' +
    'and End jump to the ends. With `activateOn="hover"` a header opens on keyboard focus as well as mouse ' +
    "hover, so nothing is pointer-only; touch opens on tap. Images are decorative unless `imageAlt` is " +
    "given. The widening stops animating under reduced motion.",
});
