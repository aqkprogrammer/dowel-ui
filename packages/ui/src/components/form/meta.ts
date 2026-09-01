import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "form",
  title: "Form",
  description: "Accessible field wiring that works with any form library, or none.",
  category: "form",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["form.tsx"],
  a11y:
    "FormField generates the id, points the Label at the control, and assembles aria-describedby " +
    "from whichever of the description and error are actually present — a dangling reference " +
    "announces nothing and is flagged by axe. aria-invalid follows the error. FormMessage is a " +
    "polite live region, so a late validation message is announced without interrupting.",
});
