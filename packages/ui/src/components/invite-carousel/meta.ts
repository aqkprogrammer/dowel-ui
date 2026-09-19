import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "invite-carousel",
  title: "Invite Carousel",
  description:
    "Event invitations fanned out as tilted cards — the current one upright in front, its neighbours leaning behind — advancing on a timer or by hand.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["invite-carousel.tsx", "carousel-controls.tsx"],
  a11y:
    'Follows the APG carousel pattern: a section with aria-roledescription="carousel", each card a ' +
    'labelled group with aria-roledescription="slide", and only the current card exposed (the neighbours ' +
    "are aria-hidden and inert). Automatic rotation — on by default, as in the source — has a stop/start " +
    "control first in the tab order, pauses on hover and focus, turns the live region off while rotating, " +
    "and does not start by itself under reduced motion. Previous/next buttons are named, arrow keys " +
    '(mirrored in RTL), Home and End work inside it, and the fan mirrors under dir="rtl". Background ' +
    "images are decorative unless `imageAlt` is given; participant avatars take their name as alt text.",
});
