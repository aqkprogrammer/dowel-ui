import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dialog",
  title: "Dialog",
  description: "A modal window that interrupts the user to gather a response.",
  category: "overlay",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["dialog.tsx"],
  a11y:
    "Focus is trapped while open and restored to the trigger on close; Escape and an overlay " +
    "click dismiss. Always render a DialogTitle — it names the dialog for screen readers. " +
    "Use DialogDescription, or aria-describedby, to explain consequential actions.",
});
