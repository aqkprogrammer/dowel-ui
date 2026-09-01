import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "tooltip",
  title: "Tooltip",
  description: "A short label revealed on hover or keyboard focus.",
  category: "overlay",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["tooltip.tsx"],
  a11y:
    "Opens on focus as well as hover, and Escape dismisses it. Never put essential or " +
    "interactive content in a tooltip: it is unreachable on touch and vanishes on blur. For an " +
    "icon-only button, prefer aria-label for the name and use the tooltip only to repeat it " +
    "visually.",
});
