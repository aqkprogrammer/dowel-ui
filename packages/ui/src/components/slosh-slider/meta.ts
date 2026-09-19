import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "slosh-slider",
  title: "Slosh Slider",
  description:
    "A slider whose fill behaves like liquid: the knob jumps to the value while the fill springs after it, leaning as it moves.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "motion", "radix-ui"],
  registryDependencies: [],
  files: ["slosh-slider.tsx"],
  a11y:
    'Built on the Radix slider: the knob is a focusable role="slider" with aria-valuenow, -valuemin and -valuemax, ' +
    "pointer jump-to-value, arrow keys (mirrored in right-to-left layouts), Home/End, and Page Up/Down moving by " +
    "largeStep. aria-label, aria-labelledby and aria-valuetext (or formatValue) are forwarded onto the thumb, and a " +
    "development warning fires when it is unnamed — no default name is baked in. The focus ring is drawn around " +
    "the whole bar. The liquid fill is aria-hidden decoration; under reduced motion it jumps with the knob and " +
    "never leans.",
});
