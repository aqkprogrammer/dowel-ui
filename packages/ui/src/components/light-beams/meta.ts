import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "light-beams",
  title: "Light Beams",
  description:
    "Rays of light fanning down from a point behind content, swaying slowly — a spotlight for a hero or a launch, in CSS alone.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["use-in-view"],
  files: ["light-beams.tsx"],
  a11y:
    "Pure decoration: the light is aria-hidden and takes no pointer events, and children render above it in " +
    "their own layer. It moves only by transform, pauses off-screen, and under reduced motion stands still on " +
    "its last frame. In forced-colours mode it is removed. Beams lower the contrast of text laid across them; " +
    "keep headings below the brightest part, or lower `intensity`.",
  guidance: {
    useWhen: [
      "a dark hero or launch section that should feel lit",
      "drawing the eye down to one heading or call to action",
    ],
    avoidWhen: [
      "a light, busy page — the beams need a dark surface to read",
      "a pointer-led spotlight — use cursor-follow or glow-card",
    ],
    alternatives: ["aurora-background", "cosmic-background", "gradient-background"],
  },
  composesWith: ["text-effect", "border-beam"],
  controls: {
    rays: { min: 3, max: 32, step: 1 },
    spread: { min: 20, max: 180, step: 5 },
    intensity: { min: 0, max: 1, step: 0.05 },
    blur: { min: 0, max: 40, step: 1 },
    speed: { min: 0, max: 4, step: 0.25 },
  },
});
