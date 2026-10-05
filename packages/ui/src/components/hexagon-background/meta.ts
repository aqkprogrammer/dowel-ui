import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "hexagon-background",
  title: "Hexagon Background",
  description:
    "A honeycomb of hexagon tiles that light up under the pointer and fade behind it in a trail, with an optional idle ripple that washes across from a random point.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["hexagon-background.tsx"],
  a11y:
    "The honeycomb is decorative: one aria-hidden layer with pointer-events none that adds no role or tab " +
    "stop. Children render above it in their own layer and stay fully interactive — the pointer is read from " +
    "the root as events bubble and mapped to a tile by geometry, never captured. Lighting is never the only " +
    "signal for anything. Under reduced motion the hover trail and idle ripples are off and the honeycomb is a " +
    "still pattern; ripples also pause off-screen, in hidden tabs and while the pointer is over the box. " +
    "Rendered tiles are capped at 720, growing past the cap rather than adding nodes.",
});
