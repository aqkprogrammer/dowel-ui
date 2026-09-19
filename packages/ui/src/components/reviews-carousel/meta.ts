import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "reviews-carousel",
  title: "Reviews Carousel",
  description:
    "Testimonials stacked in depth — the active review in front, the next ones receding behind — stepped through with buttons, indicators or arrow keys.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["reviews-carousel.tsx", "carousel-controls.tsx"],
  a11y:
    'Follows the APG carousel pattern: a section with aria-roledescription="carousel", each review a ' +
    'labelled group with aria-roledescription="slide", and only the active one exposed (the rest are ' +
    "aria-hidden and inert). Previous/next buttons and indicator buttons are named, the current indicator " +
    "carries aria-current, and the end buttons use aria-disabled so focus is never dropped. Arrow keys " +
    "(mirrored in RTL), Home and End work while focus is inside. `autoPlay` adds a stop/start control, " +
    "pauses on hover and focus, turns the live region off while rotating, and does not start by itself " +
    "under reduced motion.",
});
