import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "pattern-background",
  title: "Pattern Background",
  description:
    "Dots, a grid, ruled lines, diagonal stripes, a checker or fine grain behind content, in a theme colour, with optional drift — CSS only.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["use-in-view"],
  files: ["pattern-background.tsx"],
  a11y:
    "Pure decoration: the pattern is aria-hidden and takes no pointer events, and children render above it in " +
    "their own layer. Drift is off by default; when on it moves only by transform, pauses off-screen, and under " +
    "reduced motion stops on a frame identical to the first. In forced-colours mode the pattern is removed. Keep " +
    "text contrast against the background colour, not the pattern: use a low opacity behind body text.",
  guidance: {
    useWhen: [
      "a hero, empty state or card that needs texture without colour",
      "a canvas or editor surface with a dot or grid backdrop",
    ],
    avoidWhen: [
      "a pattern that should react to the pointer — use interactive-grid",
      "colour and atmosphere — use aurora-background or gradient-background",
    ],
    alternatives: ["interactive-grid", "hexagon-background", "gradient-background"],
  },
  composesWith: ["border-beam", "card"],
  controls: {
    size: { min: 8, max: 64, step: 2 },
    thickness: { min: 0.5, max: 4, step: 0.5 },
    opacity: { min: 0, max: 1, step: 0.05 },
    driftDuration: { min: 0.5, max: 10, step: 0.5 },
  },
});
