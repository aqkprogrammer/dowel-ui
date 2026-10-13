import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "carousel",
  title: "Carousel",
  description:
    "A row of items you scroll through, one or several at a time: native swipe and snap, previous/next, dots, arrow keys, and rotation only when asked.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button", "use-in-view", "use-reduced-motion"],
  files: ["carousel.tsx"],
  a11y:
    'Follows the APG carousel pattern: a region with aria-roledescription="carousel" named by `label`, each item ' +
    'a group with aria-roledescription="slide" and an "n of m" name, and named previous/next buttons that disable ' +
    "at the ends. The viewport is focusable and the arrow keys step through it in reading direction; Home and End " +
    "jump. Position changes are announced politely, except while rotating. Rotation is off by default; when on it " +
    "pauses on hover, on focus, off-screen and in hidden tabs, never starts by itself under reduced motion, and " +
    "needs a CarouselPlayPause (development builds warn without one). Every item stays in the page and reachable " +
    "by scrolling, with or without JavaScript.",
  guidance: {
    useWhen: [
      "a row of cards, products or images that does not fit the width",
      "a gallery the reader swipes through on a phone",
    ],
    avoidWhen: [
      "content the reader must see — carousels hide most of what they hold; use a grid",
      "a 3D or fanned presentation — use carousel-3d or card-spread",
    ],
    alternatives: ["carousel-3d", "swipe-carousel", "marquee", "reviews-carousel"],
  },
  composesWith: ["card", "product-card"],
  controls: {
    itemsPerView: { min: 1, max: 5, step: 1 },
    gap: { min: 0, max: 48, step: 4 },
    interval: { min: 1000, max: 10000, step: 500 },
    defaultIndex: { hidden: true },
    index: { hidden: true },
  },
});
