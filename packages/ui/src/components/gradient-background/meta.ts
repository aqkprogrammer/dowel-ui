import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "gradient-background",
  title: "Gradient Background",
  description:
    "A full-bleed animated gradient in three moods — a slow linear pan, swaying aurora ribbons or an orbiting mesh — with optional SVG film grain and a pointer-following light.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["gradient-background.tsx"],
  a11y:
    "The gradient, grain and pointer light are decorative: one aria-hidden layer with pointer-events none " +
    "that adds no role or tab stop. Children render above it in their own layer and stay fully interactive — " +
    "the pointer is read from the root as events bubble, never captured. Text over the gradient needs its own " +
    "contrast (a card or a scrim), since the colours move behind it. Under reduced motion every loop stops and " +
    "each variant rests in a composed still layout, and the pointer light is not rendered; its spring is " +
    'wrapped in MotionConfig reducedMotion="user". Touch input is ignored.',
});
