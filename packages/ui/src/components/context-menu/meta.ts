import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "context-menu",
  title: "Context Menu",
  description:
    "A right-click menu that pops from the pointer with a spring and staggers its items in — same parts as Dropdown Menu.",
  category: "overlay",
  status: "beta",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["context-menu.tsx"],
  a11y:
    "Opens on right-click, long press, Shift+F10 or the Menu key — the keyboard paths need a focusable " +
    "trigger. Full menu keyboard model: arrows move, Home/End jump, typeahead searches, Escape closes and " +
    "returns focus, Right/Left open and close submenus (mirrored in RTL). Checkbox and radio items expose " +
    "aria-checked; shortcuts are aria-hidden hints. A context menu is invisible until summoned, so its " +
    "actions should also be reachable elsewhere. The pop and stagger stop under reduced motion.",
});
