import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "slide-to-confirm",
  title: "Slide to Confirm",
  description:
    "A track whose grip you slide to the end to confirm — bencho's wash-and-morph pill or SmoothUI's power-off slide — with a press-and-hold path.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "motion", "radix-ui"],
  registryDependencies: [],
  files: ["slide-to-confirm.tsx"],
  a11y:
    "The grip is a real button named by the label and described by a hint. Pressing and holding Enter or " +
    "Space (or holding the pointer still on it) carries the grip across over holdDuration and confirms; " +
    'letting go early sends it back, so dragging is never the only way through. The result ("Confirmed" / ' +
    '"Shutting down…") is announced through a polite status region. The grip travels toward the inline end ' +
    "and its arrow mirrors in right-to-left layouts. Under reduced motion the springs are instant, the " +
    "shimmer stops and the hold still works.",
});
