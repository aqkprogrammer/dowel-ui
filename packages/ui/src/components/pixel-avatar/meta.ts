import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "pixel-avatar",
  title: "Pixel Avatar",
  description:
    "A deterministic pixel avatar generated from a seed — crisp SVG, coloured from theme tokens, with a gentle shimmer.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["pixel-avatar.tsx"],
  a11y:
    "Decorative by default (aria-hidden), for the usual case of an avatar beside a visible name. Pass aria-label — " +
    'the agent\'s name, not the seed — to make it role="img". The shimmer is decoration and stops under reduced ' +
    "motion, leaving the resting grid.",
});
