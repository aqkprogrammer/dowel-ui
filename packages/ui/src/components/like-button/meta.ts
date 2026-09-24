import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "like-button",
  title: "Like Button",
  description:
    "A heart toggle with a rolling count: liking pops the heart with a ring burst and radiating dots, unliking deflates quietly.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["number-flow"],
  files: ["like-button.tsx"],
  a11y:
    'A toggle button exposed with aria-pressed and named "Like, 128" — the count is part of the name, since ' +
    "the rolling digits are aria-hidden. Changes are not announced beyond the pressed state a screen reader " +
    "already reports. The icon, ring and dots are decorative. Nothing animates on first paint, and under " +
    "reduced motion every keyframe snaps to its resting frame. Colour is never the only signal: the heart " +
    "also fills.",
});
