import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "letter-swap",
  title: "Letter Swap",
  description:
    "A label whose letters roll over one after another on hover or focus — its own, or the link or button it sits in.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["letter-swap.tsx"],
  a11y:
    "The label is read as one word: the real text is a visually hidden copy and the rolling letters are " +
    "aria-hidden, so a screen reader never spells it out. It rolls for keyboard focus exactly as for hover, " +
    "on itself or on the link or button around it. Under reduced motion the swap is instant, and since the " +
    "letters are the same, nothing visibly moves.",
  guidance: {
    useWhen: [
      "navigation links and footer items that want a little life on hover",
      "the label of a button or call to action",
    ],
    avoidWhen: [
      "sentences or body text — it is for short labels",
      "text that should change to another word — use text-swap",
    ],
    alternatives: ["text-swap", "effect-button", "scramble-text"],
  },
  composesWith: ["button", "sidebar"],
  controls: {
    stagger: { min: 0, max: 80, step: 2 },
    duration: { min: 100, max: 800, step: 20 },
  },
});
