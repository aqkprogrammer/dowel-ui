import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "interactive-grid",
  title: "Interactive Grid",
  description:
    "A grid of cells behind content that lights up around the pointer and fades out behind it, with ripples on a press — and, if you like, now and then by itself.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["interactive-grid.tsx", "interactive-grid-sim.ts"],
  a11y:
    "Pure decoration: the canvas is aria-hidden and ignores the pointer, which is tracked on the root without " +
    "capturing events, so content inside keeps its roles, focus order and hit areas, and nothing depends on the " +
    "effect. It draws only while something is moving and pauses off-screen and in hidden tabs. Under reduced " +
    "motion the highlight follows the pointer directly with no trail, presses make no ripples, and idle ripples " +
    "never start.",
  guidance: {
    useWhen: [
      "a hero or sign-up section that should answer the pointer",
      "a developer-tool landing page that wants a technical texture",
    ],
    avoidWhen: [
      "a static texture — use pattern-background, which costs nothing",
      "behind dense reading text",
    ],
    alternatives: ["pattern-background", "hexagon-background", "gravity-stars-background"],
  },
  composesWith: ["border-beam", "text-effect"],
  controls: {
    cell: { min: 12, max: 64, step: 2 },
    cellSize: { min: 0.1, max: 1, step: 0.02 },
    radius: { min: 40, max: 400, step: 10 },
    decay: { min: 0.1, max: 0.99, step: 0.01 },
    accent: { kind: "color" },
  },
});
