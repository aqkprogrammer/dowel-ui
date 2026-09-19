import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "drag-stepper",
  title: "Drag Stepper",
  description:
    "A pill number stepper: tap − or + to step, or hold either one to stretch into a sweep and drag to scrub.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["drag-stepper.tsx"],
  a11y:
    'The value is a text input with role="spinbutton", aria-valuenow, -valuemin, -valuemax and an optional ' +
    "aria-valuetext from formatValue. Up/Right step up and Down/Left step down (Left/Right mirror in right-to-left " +
    "layouts, and leave the caret alone while a number is being typed), Page Up/Down take large steps, Home/End " +
    "jump to the bounds. Typing commits on Enter or blur, clamped to the range; Escape discards the draft. The − " +
    'and + side buttons are real, named buttons ("Decrease", "Increase") that step on click, so Enter and Space ' +
    "work; they report aria-disabled at the bounds but stay focusable. Holding one to sweep is a pointer " +
    "convenience with no keyboard-only behaviour behind it. The fill is aria-hidden, and the sweep's stretch and " +
    "swell are CSS transitions that stop under reduced motion. A development warning fires when the value is " +
    "unnamed.",
});
