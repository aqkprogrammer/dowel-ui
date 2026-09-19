import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "carousel-3d",
  title: "3D Carousel",
  description:
    "A 3D carousel of cards — a fanned arc or a CoverFlow path — with buttons, dots, arrow keys and swipe.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["carousel-3d.tsx"],
  a11y:
    'Follows the APG tabbed carousel: a region with aria-roledescription="carousel", slides that are tabpanels with ' +
    'aria-roledescription="slide" and a position label, named previous/next buttons, and a tablist of dots with a ' +
    "roving tab stop. Arrow keys (mirrored in right-to-left layouts), Home and End move between slides anywhere in " +
    "the carousel; changes are announced through a polite status. Only the current slide is in the accessibility " +
    "tree and tab order — the neighbours are inert, and clicking one selects it. Swipe is a pointer convenience " +
    "with button, dot and key equivalents. It never rotates on its own. Motion stops under reduced motion.",
});
