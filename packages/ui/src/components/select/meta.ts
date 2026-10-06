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
    "options prefer Combobox — scrolling a long listbox by keyboard is slow. The opening pop, " +
    "option stagger and tick pop are decoration and stop under reduced motion.",
  guidance: {
    useWhen: [
      "picking one value from a short, known list",
      "options that carry an icon or a line of description",
    ],
    avoidWhen: [
      "more than about a dozen options, or a list to search — use combobox",
      "a few options that should all stay visible — use radio-group",
      "a list of actions — use dropdown-menu",
    ],
    alternatives: ["combobox", "radio-group", "dropdown-menu", "toggle-group"],
  },
  composesWith: ["label", "form"],
});
