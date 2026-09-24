import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "gooey-nav",
  title: "Gooey Nav",
  description:
    "A segmented nav bar whose selected item lifts out of the group as its own tile while the rest close back into one piece, all on one spring.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["gooey-nav.tsx"],
  a11y:
    'A <nav> (name it with aria-label) containing a real list. Items are links (aria-current="page" when selected) or ' +
    'buttons (aria-current="true"), all in the Tab order; ArrowLeft/ArrowRight follow the reading direction and wrap, ' +
    "and Home/End jump to the ends. Disabled items are disabled buttons, or links with aria-disabled that ignore " +
    "activation. Icons are aria-hidden, so an icon-only item needs a text label (visually hidden if you like). The " +
    "selected tile differs by its separation and shape as well as colour, so colour is never the only signal; check " +
    "the contrast of any activeClassName you pass. The bar never wraps and scrolls horizontally when it outgrows its " +
    'container. The spring runs through motion inside MotionConfig reducedMotion="user" and jumps under reduced motion.',
});
