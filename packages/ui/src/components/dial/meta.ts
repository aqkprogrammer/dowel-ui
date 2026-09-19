import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dial",
  title: "Dial",
  description:
    "A rotary dial input — a knob inside a filling arc with detent ticks — turned by drag, wheel or keys.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["dial.tsx"],
  a11y:
    'The dial is the role="slider" element (name it with aria-label or aria-labelledby), with aria-valuetext ' +
    "from `format`. Arrow keys step, PageUp/PageDown move a page, Home/End go to the ends. Dragging points the " +
    "notch at the pointer; the wheel turns it only while it has focus, so it never steals page scroll. " +
    "Clockwise means more in every language, so neither the dial nor its arrow keys mirror in right-to-left " +
    "layouts. The knob's rotation settles instantly under reduced motion.",
});
