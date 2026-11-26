import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "elastic-slider",
  title: "Elastic Slider",
  description:
    "A slider made of rubber: pull past either end and the track stretches after you, pushing the icon aside, then springs back.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "motion", "radix-ui"],
  registryDependencies: [],
  files: ["elastic-slider.tsx"],
  a11y:
    'Built on the Radix slider: a role="slider" thumb with arrow keys, Home/End, Page Up/Down, right-to-left ' +
    "and a hidden form input. Name it with aria-label or aria-labelledby; formatValue sets the spoken " +
    "aria-valuetext as well as the floating label. The floating value also shows on keyboard focus. The stretch " +
    "is decoration on top of an ordinary slider and never happens under reduced motion; the icons are aria-hidden.",
  guidance: {
    useWhen: [
      "a volume, brightness or zoom control where a little physical feedback at the limits suits the product",
    ],
    avoidWhen: [
      "a range with two thumbs — use slider",
      "a value that must be exact — use quantity-input",
    ],
    alternatives: ["slider", "slosh-slider", "scrubber"],
  },
});
