import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-artifact",
  title: "Artifact",
  description:
    "A titled frame for something the model produced, with preview and code panes that slide along one axis and a copy action.",
  category: "ai",
  status: "beta",
  dependencies: [],
  registryDependencies: ["copy-button", "tabs"],
  files: ["ai-artifact.tsx"],
  a11y:
    "A group named by its title. With both panes it is a real tablist (arrow keys move between Preview and Code, " +
    "each panel focusable and named by its tab); with one code pane, the scrolling source is a focusable region " +
    "named by the title. Copying announces success and failure through Copy Button. The pane slide mirrors in " +
    "right-to-left layouts, never plays on mount, and stops under reduced motion.",
});
