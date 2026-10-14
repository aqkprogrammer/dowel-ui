import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "image-trail",
  title: "Image Trail",
  description:
    "Images dropped along the pointer's path as it crosses a section, each landing, holding a moment and fading — scoped to its box, the cursor left alone.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["use-reduced-motion"],
  files: ["image-trail.tsx"],
  a11y:
    "Decoration only: the images are alt-less and aria-hidden, take no pointer events, and sit behind the " +
    "content by default, so nothing inside changes role, order or hit area. The system cursor is left alone " +
    "and nothing happens outside the box. Off for touch, which has no hover path, and under reduced motion, " +
    "where the images never appear. Do not put meaning in the images: anyone not using a mouse never sees them.",
  guidance: {
    useWhen: [
      "a portfolio or studio hero that shows work as the pointer moves",
      "a playful teaser for a gallery or a collection",
    ],
    avoidWhen: [
      "showing images the reader needs — use a gallery or carousel",
      "touch-first pages, where it never appears",
    ],
    alternatives: ["cursor-follow", "cursor-spotlight", "photo-stack"],
  },
  composesWith: ["text-effect", "scroll-reveal"],
  controls: {
    size: { min: 60, max: 320, step: 10 },
    ratio: { min: 0.5, max: 2, step: 0.05 },
    spacing: { min: 20, max: 240, step: 10 },
    lifetime: { min: 300, max: 3000, step: 100 },
    tilt: { min: 0, max: 30, step: 1 },
    poolSize: { min: 3, max: 32, step: 1 },
  },
});
