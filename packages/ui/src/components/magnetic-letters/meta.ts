import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "magnetic-letters",
  title: "Magnetic Letters",
  description:
    "Text whose letters are pulled toward the pointer — or pushed away from it — and spring back home when it leaves.",
  category: "effects",
  status: "beta",
  dependencies: [],
  registryDependencies: ["use-reduced-motion"],
  files: ["magnetic-letters.tsx"],
  a11y:
    "The text is read as written: a visually hidden copy carries it and the letters are aria-hidden. The " +
    "effect is decoration that needs a mouse, so it is off for touch and under reduced motion, where the text " +
    "is simply text. It listens on its parent without capturing events, so nothing around it changes how it " +
    "is used.",
  guidance: {
    useWhen: [
      "one display heading or wordmark in a hero that should answer the pointer",
      "a playful call-out on a portfolio or landing page",
    ],
    avoidWhen: [
      "body text or anything longer than a line",
      "touch-first pages, where it never responds",
    ],
    alternatives: ["proximity-text", "letter-swap", "magnetic-button"],
  },
  composesWith: ["cursor-spotlight", "interactive-grid"],
  controls: {
    strength: { min: 0, max: 40, step: 1 },
    radius: { min: 30, max: 400, step: 10 },
  },
});
