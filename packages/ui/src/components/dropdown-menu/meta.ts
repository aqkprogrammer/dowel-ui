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
    "belong in a nav, and value selection belongs in Select.",
});
