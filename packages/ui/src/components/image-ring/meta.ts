import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "image-ring",
  title: "Image Ring",
  description:
    "Images stood on a slowly turning ring — a circular gallery in CSS 3D that you can drag or turn with the arrow keys.",
  category: "display",
  status: "beta",
  dependencies: [],
  registryDependencies: ["use-in-view", "use-reduced-motion"],
  files: ["image-ring.tsx"],
  a11y:
    "A named region holding a list of images, so every alt text is read in order whatever is in front. Focus " +
    "it and the arrow keys turn it one image at a time. It turns on its own only while nobody is pointing at " +
    "or focused on it, while it is on screen and the tab is visible, and never under reduced motion — where a " +
    "manual turn also jumps instead of easing.",
  guidance: {
    useWhen: [
      "a showcase of a dozen or so images where the motion is the point — a portfolio, a launch page",
    ],
    avoidWhen: [
      "images people need to inspect — use carousel or a grid",
      "fewer than five images — the ring looks sparse; use photo-stack",
    ],
    alternatives: ["carousel-3d", "carousel", "photo-stack", "marquee"],
  },
  composesWith: ["hero-minimal"],
  controls: {
    itemWidth: { min: 80, max: 280, step: 4 },
    itemHeight: { min: 80, max: 360, step: 4 },
    gap: { min: 0, max: 64, step: 2 },
    duration: { min: 0, max: 120, step: 5 },
    tilt: { min: -30, max: 30, step: 1 },
  },
});
