import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "magnify-dock",
  title: "Magnify Dock",
  description:
    "A macOS-style dock whose icons grow, lift and show a label as the pointer or keyboard focus passes over them.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["magnify-dock.tsx"],
  a11y:
    'A toolbar (role="toolbar", named "Dock" by default, aria-orientation horizontal) with one roving tab stop: ' +
    "ArrowLeft/ArrowRight move between items (mirrored in right-to-left layouts, wrapping), Home/End jump to the " +
    "ends, and disabled items are skipped. Items are real buttons, or links when given an href, named by their " +
    'label; icons and the tooltip pill are aria-hidden. The active item carries aria-current="page" rather than ' +
    "aria-pressed: the dock marks where you are, like a nav bar, and only one item is ever current, so it is not a " +
    "set of toggles. Magnification and the tooltip follow keyboard focus as well as hover, so keyboard users get " +
    "the same feedback. Under reduced motion items still magnify, without animating.",
});
