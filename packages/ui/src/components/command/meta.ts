import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "command",
  title: "Command",
  description: "A searchable command palette, with groups and a ⌘K dialog variant.",
  category: "navigation",
  status: "stable",
  dependencies: [],
  registryDependencies: ["dialog"],
  files: ["command.tsx"],
  a11y:
    'The input owns role="combobox" and the list role="listbox"; focus stays in the input while ' +
    "arrow keys move aria-activedescendant, so typing is never interrupted. Enter runs the " +
    "active item through the same path as a click. A group whose items are all filtered out " +
    "hides its heading rather than labelling nothing. CommandDialog always renders a title and " +
    "description, visually hidden, so the dialog is never unnamed.",
});
