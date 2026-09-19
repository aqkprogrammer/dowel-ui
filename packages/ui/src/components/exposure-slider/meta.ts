import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "exposure-slider",
  title: "Exposure Slider",
  description:
    "A camera-style exposure dial: a draggable ruler of notches under a fixed centre mark, with a value ring.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["exposure-slider.tsx"],
  a11y:
    'The ruler is a focusable role="slider" with aria-valuenow, -valuemin, -valuemax and an aria-valuetext taken ' +
    "from formatValue. Arrow keys move one step (Left/Right follow the reading direction), Page Up/Down move " +
    "largeStep, Home/End jump to the ends — so the drag is never the only way to set it. aria-label and " +
    "aria-labelledby passed to the component land on the slider, and a development warning fires when it has no " +
    "name. The ring and notches are aria-hidden: the slider already reports the value. The settle animation is a " +
    "CSS transition and stops under reduced motion.",
});
