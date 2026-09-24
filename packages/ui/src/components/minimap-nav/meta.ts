import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "minimap-nav",
  title: "Minimap Nav",
  description:
    "A document minimap of hairline dashes, one per section, that swell near the pointer, pulse as the reader scrolls past, and jump to their section on click.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["minimap-nav.tsx"],
  a11y:
    'A <nav> (aria-label defaults to "On this page") containing a list of real in-page links, one per section, named by ' +
    "the section label; the dashes themselves are aria-hidden. The list is a single Tab stop: ArrowUp/ArrowDown, Home and " +
    "End move between links, and the stop returns to the current section when focus leaves. Activating a link scrolls " +
    "to the target (instantly under reduced motion), writes its hash without a history entry, and moves focus to the " +
    "target — adding tabindex=-1 when it is not focusable — so reading continues there. The current section carries " +
    'aria-current="location" persistently; the scroll pulse is visual only. The label appears beside a dash on hover ' +
    "and on keyboard focus, so sighted keyboard users can see where a dash goes. Rows are 8px tall, below the 24px " +
    "target size: pair it with a regular table of contents, or hide it, on touch and small screens. Proximity is " +
    'ignored for touch. Springs run through motion inside MotionConfig reducedMotion="user" and jump under reduced motion.',
});
