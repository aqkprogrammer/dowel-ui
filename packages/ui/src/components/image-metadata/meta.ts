import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "image-metadata",
  title: "Image Metadata",
  description:
    "An image with a row of actions and a details button that opens a metadata panel, lifting the image to make room.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["image-metadata.tsx"],
  a11y:
    "A disclosure: the details toggle has aria-expanded and aria-controls, and the panel is a region named by the " +
    "file name. Opening moves focus to the panel's Close button (the toggle it replaces is hidden); closing, with " +
    "that button or Escape, returns focus to the toggle. Whichever of the action row and the panel is not shown is " +
    "inert and aria-hidden. Metadata is a description list. The image needs real alt text. The lift and blur " +
    "transitions stop under reduced motion.",
});
