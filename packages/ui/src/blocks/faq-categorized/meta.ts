import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "faq-categorized",
  kind: "block",
  title: "FAQ Categorized",
  description: "Frequently asked questions in topic tabs, each topic an accordion of answers.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["accordion", "tabs"],
  files: ["faq-categorized.tsx"],
  a11y:
    "Topics are real tabs — a named tablist with arrow keys and a panel each — where the source " +
    "had buttons with role=tab and no panels. Each question is an accordion button inside a heading. " +
    "Changing topic closes the open answer, since it belongs to the topic being left. The staggered " +
    "entrance collapses to nothing under reduced motion.",
});
