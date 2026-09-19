import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "logo-grid-tooltips",
  kind: "block",
  title: "Logo grid tooltips",
  description:
    "A panel of grayscale logos that lift into colour and name themselves in a tooltip on hover or focus, in three to six columns.",
  category: "layout",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["tooltip"],
  files: ["logo-grid-tooltips.tsx"],
  a11y:
    "One section landmark named by its heading (level set with `headingLevel`); the logos are a " +
    "list. Each entry is named by its organisation and the graphic is aria-hidden; the tooltip " +
    "only repeats that name, so nothing depends on it. The source's hover state and tooltip were " +
    "pointer-only — here linked logos show both on keyboard focus too, with the shared focus ring.",
});
