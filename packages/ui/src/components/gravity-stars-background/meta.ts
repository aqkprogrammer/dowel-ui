import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "gravity-stars-background",
  title: "Gravity Stars Background",
  description:
    "Drifting particles the pointer bends like a gravity well: they fall into orbit, are slung out glowing when it leaves, and a click sends a shockwave.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["gravity-stars-background.tsx", "gravity-stars-background-sim.ts"],
  a11y:
    "The field is decoration: the canvas is aria-hidden and ignores the pointer, and children render above it " +
    "in their own layer with their roles, focus order and hit areas intact. The gravity well and shockwave " +
    "are optional pointer flourishes tracked on the root without capturing or cancelling events, so nothing " +
    "depends on them and no keyboard equivalent is needed. A lifted finger releases the well, since touch has " +
    "no hover. The loop pauses off-screen and in hidden tabs; under reduced motion (or a --motion-scale near " +
    "zero) it draws one still frame of the field and its links, and the pointer and clicks do nothing.",
});
