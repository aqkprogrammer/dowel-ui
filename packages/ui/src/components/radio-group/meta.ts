import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "radio-group",
  title: "Radio Group",
  description: "A set of mutually exclusive options.",
  category: "form",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["radio-group.tsx"],
  a11y:
    "Arrow keys move between options and select as they go, and the group is a single tab stop — " +
    "the standard radio model. Give the group an accessible name with aria-labelledby, and each " +
    "item a Label tied by htmlFor/id.",
});
