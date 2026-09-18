import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "glow-card",
  title: "Glow Card",
  description:
    "Card surfaces with a soft glow that follows the pointer, alone or continuously across a group.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["glow-card.tsx"],
  a11y:
    "The glow is a decorative, aria-hidden, pointer-events-none layer, so the card's own content and " +
    "semantics are untouched; use asChild to make the whole card a link or button. The pointer handler " +
    "writes custom properties directly and never re-renders. The glow is off for touch input and under " +
    "prefers-reduced-motion, where the layer is not displayed at all.",
});
