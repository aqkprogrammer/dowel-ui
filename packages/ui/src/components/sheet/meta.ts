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
    "to convey the role.",
});
