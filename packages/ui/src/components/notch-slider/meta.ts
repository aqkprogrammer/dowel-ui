import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "notch-slider",
  title: "Notch Slider",
  description:
    "A discrete slider over named notches such as XS to XL, with a dark pill thumb that slides between them and a label that brightens.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["notch-slider.tsx"],
  a11y:
    'Built on the Radix slider primitive with integer steps over the options: a role="slider" thumb whose aria-valuetext is the ' +
    'option\'s name (or a fuller spoken name from `optionLabels`, so "M" can be read as "Medium"), moved by Arrow keys, ' +
    'Home/End and pointer drag. It is named "Size" unless aria-label or aria-labelledby says otherwise. The visible labels are ' +
    "aria-hidden duplicates that pointer users can also click. The focus ring is drawn around the track, the active label is " +
    "marked by weight as well as colour, and the whole control mirrors in right-to-left layouts. Under reduced motion the thumb jumps.",
  guidance: {
    useWhen: [
      "choosing one value from a short ordered scale: sizes, densities, intensity levels",
    ],
    avoidWhen: [
      "unordered choices — use segmented-pill or radio-group",
      "continuous values — use slider",
    ],
    alternatives: ["slider", "segmented-pill", "toggle-group"],
  },
});
