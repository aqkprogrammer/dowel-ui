import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "highlight-text",
  title: "Highlight Text",
  description:
    "A marker stroke, thick underline or strike drawn on behind words as they scroll into view, when hovered or focused, or at once.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["use-in-view"],
  files: ["highlight-text.tsx"],
  a11y:
    "The text is never touched; the highlight is a background, so the words read, wrap and copy as written. " +
    "The hover trigger also draws for keyboard focus, on the element or inside it. Under reduced motion the " +
    "highlight appears at once instead of drawing. It is visual emphasis only: render it as <mark> or <strong> " +
    "with `as` when the emphasis matters to the meaning, so assistive technology conveys it too. Keep marker " +
    "colours light enough that the text over them still meets contrast.",
  guidance: {
    useWhen: [
      "picking out the key phrase in a hero or a testimonial",
      "drawing attention to a changed value or a promise in copy",
    ],
    avoidWhen: [
      "search-result highlighting — use a plain <mark> styled once",
      "a gradient-filled word — use gradient-text",
    ],
    alternatives: ["gradient-text", "shimmer-text", "text-effect"],
  },
  composesWith: ["scroll-reveal", "text-effect"],
  controls: {
    duration: { min: 100, max: 2000, step: 50 },
    delay: { min: 0, max: 1500, step: 50 },
  },
});
