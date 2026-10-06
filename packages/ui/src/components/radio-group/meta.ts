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
  guidance: {
    useWhen: ["choosing exactly one of a few options that should all be visible"],
    avoidWhen: [
      "a long list of options — use select or combobox",
      "several independent choices — use checkbox",
      "a compact segmented control in a toolbar — use toggle-group",
    ],
    alternatives: ["select", "checkbox", "toggle-group"],
  },
  composesWith: ["label", "form"],
});
