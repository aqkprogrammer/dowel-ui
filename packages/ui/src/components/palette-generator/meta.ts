import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "palette-generator",
  title: "Palette Generator",
  description:
    "A row of swatches that melt together through a goo filter and pop back out in a new palette.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["palette-generator.tsx"],
  a11y:
    'The refresh control is a named button ("Generate a new palette") with a focus ring. The swatches are a ' +
    "labelled list of images named by colour, and each new palette is announced through a polite live region " +
    "(missing in the source). The melt is decoration: under reduced motion the colours swap at once.",
});
