import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "cursor-spotlight",
  title: "Cursor Spotlight",
  description:
    "A spotlight that follows the pointer inside a box: a soft glow behind the content, or a flashlight that dims everything but the circle around the pointer.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["use-reduced-motion"],
  files: ["cursor-spotlight.tsx"],
  a11y:
    "Decoration only: the light is aria-hidden and takes no pointer events, the system cursor is left alone, " +
    "and nothing happens outside the box. It is absent until the pointer is inside, so reveal mode never dims " +
    "content nobody is pointing at, and keyboard, touch and reduced-motion users see the content exactly as " +
    "written — it is off for touch and under reduced motion. Never put anything only the spotlight shows.",
  guidance: {
    useWhen: [
      "a dark hero or feature section that should answer the pointer",
      "a playful flashlight effect over a grid of logos or work",
    ],
    avoidWhen: [
      "a glow on the edge of cards — use glow-card",
      "a dot that trails the pointer — use cursor-follow",
    ],
    alternatives: ["glow-card", "cursor-follow", "interactive-grid"],
  },
  composesWith: ["pattern-background", "text-effect"],
  controls: {
    radius: { min: 40, max: 600, step: 10 },
    intensity: { min: 0, max: 1, step: 0.05 },
  },
});
