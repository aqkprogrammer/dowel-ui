import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "bento-grid",
  title: "Bento Grid",
  description:
    "Tiles of different sizes in one tidy grid — the layout behind a feature section or a dashboard overview — single-column on small screens.",
  category: "layout",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["bento-grid.tsx"],
  a11y:
    "A plain grid: tiles stay in document order, so reading order, tab order and visual order agree. On small " +
    "screens every tile is full width and as tall as its content. `dense` lets small tiles fill gaps and can " +
    "therefore move them visually away from their place in the reading order — leave it off when order " +
    "matters. Give each tile a heading so the grid can be navigated by headings.",
  guidance: {
    useWhen: [
      "a feature section with one hero feature and several smaller ones",
      "a dashboard overview of mixed-size widgets",
    ],
    avoidWhen: [
      "a uniform list of equal items — use a plain grid",
      "a whole marketing section ready made — use the features-bento block",
    ],
    alternatives: ["card", "stacking-cards"],
  },
  composesWith: ["card", "glow-card", "border-beam"],
  controls: {
    gap: { min: 0, max: 48, step: 2 },
    rowHeight: { min: 80, max: 400, step: 10 },
  },
});
