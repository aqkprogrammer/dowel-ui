import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "features-icon-grid",
  kind: "block",
  title: "Features icon grid",
  description:
    "A features section: a grid of cards, each an icon, a title and a sentence, rising into view as the page scrolls.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["card"],
  files: ["features-icon-grid.tsx"],
  a11y:
    "One section landmark, named by its heading, whose level is set with `headingLevel`; feature " +
    "titles sit one level below it so the block fits any page outline. The features are a real " +
    "list, and icons are decorative (aria-hidden) — the title carries the meaning. Only a grid " +
    "that starts below the fold is hidden before it scrolls in, so nothing on screen flashes, and " +
    "under reduced motion or without IntersectionObserver nothing is hidden at all.",
});
