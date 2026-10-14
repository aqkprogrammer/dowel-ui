import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "parallax",
  title: "Parallax",
  description:
    "Content that moves at its own rate as the page scrolls — lagging for depth, leading for emphasis — without touching the scroll itself.",
  category: "effects",
  status: "beta",
  dependencies: [],
  registryDependencies: ["use-in-view", "use-reduced-motion"],
  files: ["parallax.tsx"],
  a11y:
    "Decorative movement only: the content keeps its place in the document, its order and its focus, and the " +
    "page scrolls exactly as it would without it. It writes only a transform, once a frame, and only while near " +
    "the screen. Under reduced motion it does not move at all. Keep `max` modest so moved content never covers " +
    "something the reader needs.",
  guidance: {
    useWhen: [
      "layered hero imagery that should feel deep as the page scrolls",
      "a decorative shape or image beside text, drifting at its own pace",
    ],
    avoidWhen: [
      "text the reader is reading — moving text is harder to read",
      "anything interactive, which should stay where the reader expects it",
    ],
    alternatives: ["scroll-reveal", "stacking-cards", "horizontal-scroll"],
  },
  composesWith: ["scroll-reveal"],
  controls: {
    speed: { min: -1, max: 1, step: 0.05 },
    max: { min: 0, max: 600, step: 10 },
  },
});
