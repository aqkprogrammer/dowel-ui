import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "rail-nav",
  title: "Rail Nav",
  description:
    "A vertical navigation list whose active marker springs between rows: a bouncing dot that squashes and stretches, or a dashed rail that hooks into the active row.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["rail-nav.tsx"],
  a11y:
    "A <nav> named by its visible label (aria-labelledby) or by aria-label, containing a real list. Each row is a link " +
    '(aria-current="page" when active) or a button (aria-current="true"), all in the Tab order; ArrowUp/ArrowDown ' +
    "(wrapping), Home and End also move focus between rows. Headings are plain list items, never focusable, and the " +
    "marker skips them. Disabled rows are disabled buttons, or links with aria-disabled that ignore activation. The " +
    "marker, the rails and the hover rail are one aria-hidden layer that ignores the pointer; the active row is also " +
    "set apart by text colour and aria-current, so the marker is never the only signal. Springs run through motion inside " +
    'MotionConfig reducedMotion="user", and under reduced motion the marker jumps without squash or overshoot.',
});
