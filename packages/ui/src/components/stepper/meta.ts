import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "stepper",
  title: "Stepper",
  description:
    "A multi-step wizard's progress — connectors fill, finished steps draw a check, and each step's content slides in from the side it comes from.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["stepper.tsx"],
  a11y:
    'An ordered list named "Progress", with aria-current="step" on the current step and finished steps ' +
    'named with a visually hidden "completed". Steps are plain list items unless `navigation` makes them ' +
    "choosable; then they are buttons sharing one tab stop, moved between with the arrow keys (mirrored in " +
    "RTL, Up/Down when vertical), Home and End, and chosen with Enter or Space. The content area is a group " +
    "labelled by the current step. Horizontal labels collapse to screen-reader-only text on narrow screens. " +
    "All motion is CSS decoration and stops under reduced motion.",
});
