import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "radial-nav",
  title: "Radial Nav",
  description:
    "Navigation on a ring around a hub: an arc indicator springs to the active item the short way round, and the hub cross-fades to its icon and label.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["radial-nav.tsx"],
  a11y:
    'A <nav> (named by aria-label, "Main" by default, or aria-labelledby) around a real list. With href each item is ' +
    'a link and the active one carries aria-current="page"; without, items are toggle buttons and the active one is ' +
    "aria-pressed. Every item is named by its label in visually hidden text. The list is one Tab stop with a roving " +
    "tabindex: ArrowRight/ArrowDown move forward round the ring and ArrowLeft/ArrowUp back (Left/Right swap in " +
    "right-to-left), wrapping, and Home/End jump to the first and last. The track, indicator, hub and hover captions " +
    "are aria-hidden; the active item is also set apart by its fill, so the indicator is never the only signal. " +
    'Springs run through motion inside MotionConfig reducedMotion="user"; nothing moves on first paint, and under ' +
    "reduced motion the indicator jumps.",
});
