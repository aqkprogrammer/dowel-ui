import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "team-carousel",
  kind: "block",
  title: "Team carousel",
  description:
    "A large two-tone heading over a swipeable carousel of team member cards — avatar, name, role and a line under a divider — with previous and next buttons.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["avatar", "button", "separator"],
  files: ["team-carousel.tsx"],
  a11y:
    "Follows the APG carousel pattern: the section is a carousel named by its heading, each card " +
    'a group with the "slide" role description and a position name ("2 of 6"). The track is a ' +
    "native scroll-snap scroller — swipeable on touch, and once it overflows a focusable, named " +
    "region the keyboard can scroll — and the previous/next buttons are named, disabled at the ends, mirrored for " +
    "right-to-left pages and visible at every width. The source's five-second autoplay is " +
    "removed (WCAG 2.2.2); a button press announces the new position politely. Portraits have " +
    "empty alt because the name is read next.",
});
