import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "collapsible",
  title: "Collapsible",
  description: "A single section that opens and closes, without an accordion's set semantics.",
  category: "layout",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["collapsible.tsx"],
  a11y:
    "The trigger carries aria-expanded and points at the region it controls, both from the " +
    "primitive. Reach for this rather than an Accordion of one item: a single-item Accordion " +
    "gives its trigger a heading role and a position in a list of one, neither of which is true.",
});
