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
});
