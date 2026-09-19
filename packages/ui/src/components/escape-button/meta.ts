import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "escape-button",
  title: "Escape Button",
  description:
    "A novelty button that scoots away from an approaching mouse, then gives up after a few escapes.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["escape-button.tsx"],
  a11y:
    "The dodging is a mouse-and-pen game only: it never moves for touch, a coarse pointer, reduced motion, " +
    "or while the button has focus, so keyboard users can Tab to it and press it at once. It gives up after " +
    "`patience` escapes (4 by default) and stays put, and a press always goes through in every state — the " +
    "movement is visual, never a lock. It is a real button with its visible label as its name.",
});
