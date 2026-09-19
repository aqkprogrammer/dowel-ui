import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "gooey-popover",
  title: "Gooey Popover",
  description:
    "A round trigger whose popover pours out of it, melted together by an SVG goo filter.",
  category: "overlay",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["popover"],
  files: ["gooey-popover.tsx"],
  a11y:
    "Built on Dowel's Popover (Radix): the icon-only trigger is named by `triggerLabel` and exposes " +
    'aria-expanded; the content is a role="dialog" named by `triggerLabel` unless given aria-label or ' +
    "aria-labelledby. Opens from pointer or keyboard, moves focus into the content, closes on Escape or an " +
    "outside press, and returns focus to the trigger. The blob, goo layer and the copy of the trigger icon " +
    "drawn over it are aria-hidden and ignore the pointer. Under reduced motion the goo layer is dropped and " +
    "the panel appears in place.",
});
