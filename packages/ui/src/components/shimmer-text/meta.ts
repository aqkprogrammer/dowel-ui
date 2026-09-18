import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "shimmer-text",
  title: "Shimmer Text",
  description:
    "Text with a light band sweeping across it on a loop, or a blur-and-glide entrance as it arrives.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["shimmer-text.tsx"],
  a11y:
    "The text is never split, so it reads as one run and copies cleanly. The effect is decoration: under " +
    "reduced motion the shine becomes plain text in the base colour and the entrance settles at once to its " +
    "visible end state. In forced-colours mode the clipped gradient is dropped so the text takes the system colour. " +
    "Pick base and shine colours that both meet contrast against the background.",
});
