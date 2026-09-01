import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "combobox",
  title: "Combobox",
  description: "A searchable single-select built on the ARIA combobox pattern.",
  category: "form",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["combobox.tsx"],
  a11y:
    'The input owns role="combobox" with aria-expanded, aria-controls and aria-autocomplete; ' +
    'the list owns role="listbox" and each option role="option" with aria-selected. Focus stays ' +
    "in the input while arrow keys move aria-activedescendant, so typing is never interrupted. " +
    "Arrow navigation wraps, Home/End jump, Enter selects the active option and Escape closes.",
});
