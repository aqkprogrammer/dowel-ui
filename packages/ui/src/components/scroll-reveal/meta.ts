import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "scroll-reveal",
  title: "Scroll Reveal",
  description:
    "Content that eases into place as it scrolls into view — fading, rising, sliding, scaling or sharpening — with children arriving in turn.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["use-reduced-motion"],
  files: ["scroll-reveal.tsx"],
  a11y:
    "Content is never hidden unless it is certain to be revealed: the server renders it visible, so it reads " +
    "without JavaScript; only content below the fold is hidden on mount, never what is already on screen; and " +
    "without an IntersectionObserver or under reduced motion nothing is hidden at all. Hidden content stays in " +
    "the accessibility tree and the tab order, so a keyboard or screen reader user reaches it as usual — and " +
    "focusing it scrolls it into view, which reveals it. Scrolling is never taken over.",
  guidance: {
    useWhen: [
      "a marketing page whose sections should arrive as the reader reaches them",
      "a grid of features or cards that should appear in order",
    ],
    avoidWhen: [
      "application screens and forms, where content should simply be there",
      "revealing text word by word — use scroll-reveal-text or text-effect",
    ],
    alternatives: ["scroll-reveal-text", "text-effect", "parallax"],
  },
  composesWith: ["card", "stacking-cards", "parallax"],
  controls: {
    distance: { min: 0, max: 120, step: 4 },
    duration: { min: 100, max: 2000, step: 50 },
    delay: { min: 0, max: 1000, step: 50 },
    stagger: { min: 0, max: 300, step: 10 },
    threshold: { min: 0, max: 1, step: 0.05 },
  },
});
