import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "faq-tabbed-grid",
  kind: "block",
  title: "FAQ Tabbed Grid",
  description:
    "Frequently asked questions in category tabs, each category a grid of always-visible answers.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["tabs"],
  files: ["faq-tabbed-grid.tsx"],
  a11y:
    "Categories are real tabs (a named tablist, arrow keys, one panel each) whose underline slides " +
    "between them. Each panel is a description list — questions as terms, answers as details — so " +
    "the pairing is announced. Icons are decorative. The staggered rise of a newly shown panel " +
    "collapses to nothing under reduced motion.",
});
