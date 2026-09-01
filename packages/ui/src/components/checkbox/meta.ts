import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "checkbox",
  title: "Checkbox",
  description: "A control for an on/off choice, with support for an indeterminate state.",
  category: "form",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["checkbox.tsx"],
  a11y:
    "Toggles with Space, matching the native control. Always pair with a Label via htmlFor/id — " +
    'the box alone has no accessible name. Indeterminate is announced as "mixed" and is a ' +
    "state the application sets, not one the user can reach by clicking.",
});
