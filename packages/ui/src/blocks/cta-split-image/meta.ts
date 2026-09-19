import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "cta-split-image",
  kind: "block",
  title: "CTA split image",
  description: "A two-column call to action whose copy and image slide in from either side.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button"],
  files: ["cta-split-image.tsx"],
  a11y:
    "One section landmark named by its headline, whose level is a prop (default 2). Actions are " +
    "real links. The image is content and requires alt text; the placeholder shown without one is " +
    "aria-hidden. The slide-in follows reading direction, plays once on first scroll into view and " +
    "settles instantly under reduced motion.",
});
