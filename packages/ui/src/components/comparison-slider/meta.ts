import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "comparison-slider",
  title: "Comparison Slider",
  description:
    "Two versions of one thing stacked — before and after, light and dark — with a divider you drag, hover or step with the keyboard to reveal either.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["comparison-slider.tsx"],
  a11y:
    'The divider is a slider (role="slider", 0–100) named by `label`, with a value text that says how much of ' +
    "each side shows. Arrow keys step 1, Shift or Page Up/Down step 10, Home and End go to either side; in a " +
    'right-to-left document "before" is on the right and the arrows follow. Both versions stay in the page — the ' +
    "top one is clipped, not removed — so give images their own alt text. The side tags are decorative; their " +
    "names are spoken in the value text instead.",
  guidance: {
    useWhen: [
      "showing the effect of an edit, filter or redesign on the same image or screen",
      "comparing light and dark, or two themes, of one component",
    ],
    avoidWhen: [
      "comparing two different things side by side — use a grid or table",
      "choosing a number — use slider",
    ],
    alternatives: ["slider", "exposure-slider", "image-accordion"],
  },
  composesWith: ["card"],
  controls: {
    defaultValue: { min: 0, max: 100, step: 1 },
    value: { hidden: true },
  },
});
