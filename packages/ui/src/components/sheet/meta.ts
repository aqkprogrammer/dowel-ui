import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "sheet",
  title: "Sheet",
  description: "A panel that enters from an edge of the viewport for secondary content.",
  category: "overlay",
  status: "stable",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["sheet.tsx"],
  a11y:
    "Modal, with the same focus trapping and restoration as Dialog. Always render a SheetTitle. " +
    "For a side navigation sheet, put a nav landmark inside rather than relying on placement " +
    "to convey the role. The optional section stagger stops under reduced motion.",
  guidance: {
    useWhen: [
      "secondary content beside the page: filters, record details, settings",
      "navigation that slides in from an edge on a narrow screen",
    ],
    avoidWhen: [
      "a decision that must be answered — use dialog",
      "a bottom panel dismissed by dragging on touch screens — use drawer",
      "the app's persistent side navigation — use sidebar",
    ],
    alternatives: ["dialog", "drawer", "sidebar"],
  },
});
