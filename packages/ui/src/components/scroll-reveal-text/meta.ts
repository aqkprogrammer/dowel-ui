import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "scroll-reveal-text",
  title: "Scroll Reveal Text",
  description:
    "A paragraph whose words brighten from dim to full as it scrolls through the viewport.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["scroll-reveal-text.tsx"],
  a11y:
    "The words are aria-hidden and the paragraph is read once from an sr-only copy. Driven by CSS scroll-driven " +
    "animation where supported, with a frame-throttled scroll fallback; without either, and under reduced motion, " +
    "every word is fully legible. Dimmed words are below contrast by design until revealed, so keep essential " +
    "content out of it.",
});
