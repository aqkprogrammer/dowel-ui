import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "accordion",
  title: "Accordion",
  description: "Vertically stacked sections that expand to reveal their content.",
  category: "data",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["accordion.tsx"],
  a11y:
    "Each trigger is a button inside a heading, so screen reader users can navigate the " +
    "sections by heading. aria-expanded and aria-controls tie the trigger to its panel, and " +
    "arrow keys move between triggers.",
  guidance: {
    useWhen: [
      "a set of collapsible sections, such as an FAQ with one answer open at a time",
      "independent groups of settings that each expand",
    ],
    avoidWhen: [
      "a single section that opens and closes — use collapsible",
      "alternate views where one is always shown — use tabs",
    ],
    alternatives: ["collapsible", "tabs"],
  },
});
