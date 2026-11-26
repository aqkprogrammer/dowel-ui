import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "bubble-slider",
  title: "Bubble Slider",
  description:
    "A slider whose pill thumb shows the value, stretches with speed and rubber-bands past the ends of the track.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["bubble-slider.tsx"],
  a11y:
    'Built on the Radix slider: the thumb is role="slider" with aria-valuenow, aria-valuemin and aria-valuemax, ' +
    "and responds to Arrow keys, Page Up/Down, Home and End, with a visible focus ring. It has no visible label, " +
    "so name it with aria-label or aria-labelledby. The number drawn in the bubble and the ticks are aria-hidden; " +
    "`formatValue` sets both the bubble text and aria-valuetext, so units are spoken. Radix mirrors the slider in " +
    "right-to-left layouts. Under reduced motion the bubble neither stretches nor springs.",
  guidance: {
    useWhen: [
      "a single value where seeing the exact number on the thumb matters, such as a percentage or a level",
      "a playful settings panel where the slider can take some room",
    ],
    avoidWhen: [
      "a range with two thumbs — use slider",
      "a handful of named stops — use a segmented control or radio-group",
    ],
    alternatives: ["slider", "slosh-slider", "exposure-slider"],
  },
});
