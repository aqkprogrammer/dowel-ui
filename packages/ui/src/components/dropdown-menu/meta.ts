import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dropdown-menu",
  title: "Dropdown Menu",
  description: "A menu of actions revealed from a trigger, with submenus and selectable items.",
  category: "overlay",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["dropdown-menu.tsx"],
  a11y:
    "Full menu keyboard model: arrows move, Home/End jump, typeahead searches, Escape closes " +
    "and restores focus, Right/Left open and close submenus. Highlight is driven by " +
    "data-highlighted so pointer and keyboard focus never diverge. Use it for actions — links " +
    "belong in a nav, and value selection belongs in Select. The opening pop and item " +
    "stagger are decoration and stop under reduced motion.",
  guidance: {
    useWhen: [
      "a list of actions behind a button, such as row actions or a More menu",
      "view options shown as checkbox or radio items",
    ],
    avoidWhen: [
      "picking a value for a form field — use select",
      "searching many commands by typing — use command",
      "a list of links — use a nav element",
    ],
    alternatives: ["select", "context-menu", "command", "popover"],
  },
});
