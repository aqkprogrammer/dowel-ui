import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "scrubber",
  title: "Scrubber",
  description:
    "A design-tool number field: drag across a labelled bar to scrub a value, step it from the keyboard, or type it.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["scrubber.tsx"],
  a11y:
    'The bar is a focusable role="slider" named by its visible label, with aria-valuenow, -valuemin, -valuemax ' +
    "and an aria-valuetext matching the number on screen. Arrow keys step (Left/Right follow the reading " +
    "direction), Shift + arrow and Page Up/Down take large steps, Home/End jump to the ends. Enter or a " +
    "double-click opens a text field for an exact value (advertised with aria-keyshortcuts); Enter or blur commits, " +
    "Escape cancels, and focus returns to the slider. Ticks, fill and thumb are aria-hidden. The thumb's " +
    "transitions stop under reduced motion.",
});
