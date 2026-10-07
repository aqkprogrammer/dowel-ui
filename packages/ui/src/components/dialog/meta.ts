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
    "Use DialogDescription, or aria-describedby, to explain consequential actions. The " +
    "optional spring entrance and section stagger stop under reduced motion.",
  guidance: {
    useWhen: [
      "asking for input or a decision that must be answered before returning to the page",
      "a short, focused task such as editing one record",
    ],
    avoidWhen: [
      "confirming a destructive or irreversible action — use alert-dialog",
      "secondary content beside the page, such as filters or details — use sheet",
      "a bottom sheet on touch screens — use drawer",
    ],
    alternatives: ["alert-dialog", "sheet", "drawer", "popover"],
  },
  composesWith: ["form", "button"],
});
