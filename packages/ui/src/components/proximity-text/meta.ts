import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "proximity-text",
  title: "Proximity Text",
  description:
    "Text whose letters swell toward the pointer — larger, heavier and more tinted the nearer each one is — with the whole surrounding section live.",
  category: "effects",
  status: "beta",
  dependencies: [],
  registryDependencies: ["use-reduced-motion"],
  files: ["proximity-text.tsx"],
  a11y:
    "The text is read as written: a visually hidden copy carries it and the letters are aria-hidden. The " +
    "effect is decoration that needs a mouse, so it is off for touch and under reduced motion, where the text " +
    "is simply text. It listens on its parent without capturing events, so nothing in the section changes how " +
    "it is used. Check that the accent colour meets contrast against the background, as the nearest letters " +
    "take it fully.",
  guidance: {
    useWhen: [
      "one large display heading in a hero that should answer the pointer",
      "a playful wordmark or a short slogan",
    ],
    avoidWhen: [
      "body text or anything longer than a line",
      "touch-first pages, where it never responds",
    ],
    alternatives: ["letter-swap", "gradient-text", "scramble-text"],
  },
  composesWith: ["cursor-spotlight", "interactive-grid"],
  controls: {
    radius: { min: 30, max: 400, step: 10 },
    scale: { min: 1, max: 2.5, step: 0.05 },
    weight: { min: 100, max: 900, step: 100 },
    accent: { kind: "color" },
  },
});
