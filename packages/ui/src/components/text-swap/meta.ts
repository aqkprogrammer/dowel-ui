import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "text-swap",
  title: "Text Swap",
  description:
    "Text that animates from the old string to the new one when its value changes — fade through, shared axis X/Y/Z and per-word crossfade — with a TextRotate for cycling phrases.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["text-swap.tsx", "text-rotate.tsx"],
  a11y:
    "The incoming text is the accessible text from the moment it changes; the outgoing copy is aria-hidden " +
    "while it animates out and is then removed, and a change mid-transition replaces the pending text rather " +
    "than stacking copies. Per-word transitions keep the whole string in a visually hidden copy with the word " +
    "spans aria-hidden. Nothing is a live region unless you pass aria-live, and then only the settled value is " +
    "added, never per word. Under reduced motion the swap is instant and TextRotate stops rotating; `paused` " +
    "stops it on demand. shared-axis-x mirrors in RTL so forward always arrives from the inline end.",
});
