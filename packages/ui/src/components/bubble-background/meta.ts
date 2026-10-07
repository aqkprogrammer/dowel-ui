import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "bubble-background",
  title: "Bubble Background",
  description:
    "Large blurred colour blobs drift on long looping paths and fuse like liquid through a goo filter, with an optional blob that follows the pointer on a soft spring.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["bubble-background.tsx"],
  a11y:
    "The blob layer is decorative: aria-hidden, pointer-events none, and it adds no role or tab stop. Children " +
    "render above it in their own layer and stay fully interactive — the pointer is read from the root as " +
    "events bubble, never captured. Text over the blobs needs its own contrast (a card or a scrim), since the " +
    "colours move behind it. Under reduced motion every drift stops and the blobs rest in a composed still " +
    'layout, and the pointer follower is not rendered; its spring is wrapped in MotionConfig reducedMotion="user". ' +
    "Touch input is ignored.",
});
