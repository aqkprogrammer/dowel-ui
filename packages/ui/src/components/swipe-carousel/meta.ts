import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "swipe-carousel",
  title: "Swipe Carousel",
  description:
    "Cards on a ring seen from the front — swipe, tap or step and the ring turns, so nothing ever leaves the frame.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: ["button"],
  files: ["swipe-carousel.tsx", "carousel-controls.tsx"],
  a11y:
    'Follows the APG carousel pattern: a section with aria-roledescription="carousel", each card a ' +
    'labelled group with aria-roledescription="slide", and only the front card exposed (the others are ' +
    "aria-hidden and inert). The swipe is never the only way through: named previous/next buttons, arrow " +
    "keys (mirrored in RTL), Home and End, and a tap on a card peeking out at either side all turn the " +
    "ring. A drag that ends over a link in the front card does not follow it. Under reduced motion the ring " +
    "jumps instead of springing and the idle float stops; the spring is `motion`, wrapped in " +
    'MotionConfig reducedMotion="user".',
});
