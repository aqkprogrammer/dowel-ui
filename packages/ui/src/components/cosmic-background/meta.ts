import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "cosmic-background",
  title: "Cosmic Background",
  description:
    "Dowel's orbital mark as a living sky: a glowing core, tilted orbits with a body riding each, and a seeded field of twinkling stars that leans toward the pointer.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["cosmic-background.tsx", "cosmic-background-sim.ts"],
  a11y:
    "The scene is pure decoration: it is aria-hidden and ignores the pointer, and children render above it " +
    "in their own layer, so anything placed inside keeps its role, focus order and hit area. The pointer lean " +
    "is an optional flourish tracked on the root without capturing events. The loop pauses off-screen and in " +
    "hidden tabs; under reduced motion (or a --motion-scale near zero) it draws one still frame, each body " +
    "parked at its starting point and no parallax. Colours are theme tokens, so text contrast is the theme's; " +
    "keep text off the brightest part of the glow, or lower `glow`.",
  guidance: {
    useWhen: [
      "a hero or empty state that should carry the brand's orbital identity",
      "a dark landing section that needs depth without a WebGL scene",
    ],
    avoidWhen: [
      "a page behind dense reading text — use gradient-background or a flat surface",
      "a plain star field with no brand mark — use stars-background",
    ],
    alternatives: ["stars-background", "gravity-stars-background", "aurora-background"],
  },
  controls: {
    orbits: { min: 0, max: 3, step: 1 },
    density: { min: 0, max: 4, step: 0.25 },
    speed: { min: 0, max: 4, step: 0.25 },
    glow: { min: 0, max: 1, step: 0.05 },
    seed: { min: 1, max: 99, step: 1 },
  },
  composesWith: ["border-beam", "shimmer-text", "text-effect"],
});
