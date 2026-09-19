import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "canvas-toolbar",
  title: "Canvas Toolbar",
  description:
    "A Figma-style tool rail: one active tool with a springy fill, a shape slot that swaps its tool from a flyout, and single-key shortcuts.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: ["dropdown-menu", "tooltip"],
  files: ["canvas-toolbar.tsx"],
  a11y:
    'Built on Radix Toolbar: role="toolbar" (name it with aria-label; it warns in development when unnamed) with one tab stop, ' +
    "arrow keys that follow the reading direction, Home/End and wrap-around. Tools are toggle buttons named by their label, " +
    "with aria-pressed on the single active tool and aria-keyshortcuts when a shortcut is set; a tooltip repeats the name and key. " +
    'The slot is a named group; its notch is a menu button (aria-haspopup="menu", aria-expanded) opening Dowel\'s DropdownMenu, ' +
    "where shapes are menuitemradio items reachable with Left/Right as well as Up/Down. Escape closes the flyout and returns focus " +
    "to the notch; picking a shape returns focus to the slot's tool. Shortcuts work while focus is in the toolbar, or on the whole " +
    "document with globalShortcuts, and are ignored in inputs, textareas, contenteditable and open menus. The fill pop and the " +
    "flyout entrance are decoration and stop under reduced motion.",
});
