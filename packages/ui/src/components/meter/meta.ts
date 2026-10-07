import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "meter",
  title: "Meter",
  description:
    "A measurement against a capacity — quota, seats, spend — segmented by category.",
  category: "feedback",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["meter.tsx"],
  a11y:
    'Uses role="meter", not role="progressbar": a meter reports a level with no expectation of ' +
    "reaching the end, and screen readers phrase the two differently. The bar is one meter and " +
    "the segments inside it are decoration — making each its own widget would put several " +
    "unlabelled meters in the tab order to describe one quantity. aria-valuetext carries the " +
    'unit and the capacity, because a bare "4" says nothing about 4 of what. Per-segment detail ' +
    "lives in MeterLegend as text, where it can be read.",
  guidance: {
    useWhen: [
      "a level against a capacity: storage, seats, spend, quota",
      "usage split into categories with a legend",
    ],
    avoidWhen: [
      "how far a task has got — use progress",
      "a model's context window — use ai-token-usage",
    ],
    alternatives: ["progress", "ai-token-usage", "dither-meter"],
  },
});
