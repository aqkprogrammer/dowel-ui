import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "photo-stack",
  title: "Photo Stack",
  description:
    "A pile of photos: flick the top one away and it springs to the back, or tap, key or button through them.",
  category: "display",
  status: "beta",
  dependencies: ["motion", "radix-ui"],
  registryDependencies: ["button"],
  files: ["photo-stack.tsx"],
  a11y:
    'A carousel region (aria-roledescription="carousel") of labelled slides; only the top photo is exposed, the ' +
    'rest are aria-hidden and inert. The top photo carries a real button ("Show next photo") so Enter and Space ' +
    "cycle it; arrow keys move either way (mirrored in right-to-left layouts); optional previous/next buttons " +
    "give a visible pointer-free path; a polite status region announces the new photo. Dragging is a convenience " +
    "on top of these and is switched off under reduced motion, where cards also move without animating.",
});
