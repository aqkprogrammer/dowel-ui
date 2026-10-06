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
    "visually. The opening pop is decoration and stops under reduced motion.",
  guidance: {
    useWhen: [
      "repeating an icon-only button's name visually",
      "a short supplementary hint on hover or focus",
    ],
    avoidWhen: [
      "essential information or anything interactive — put it in the page or use popover",
      "a richer preview card — use hover-card",
    ],
    alternatives: ["popover", "hover-card"],
  },
});
