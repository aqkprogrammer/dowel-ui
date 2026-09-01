import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "select",
  title: "Select",
  description: "Picks one value from a short list of options.",
  category: "form",
  status: "stable",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["select.tsx"],
  a11y:
    "Full listbox keyboard model: arrows move, typeahead jumps, Enter selects, Escape closes and " +
    "restores focus. Give the trigger a name with aria-labelledby or a Label. Past about a dozen " +
    "options prefer Combobox — scrolling a long listbox by keyboard is slow.",
});
