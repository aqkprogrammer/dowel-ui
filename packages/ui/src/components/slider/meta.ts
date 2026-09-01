import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "slider",
  title: "Slider",
  description: "Selects a value, or a range, from a continuous span.",
  category: "form",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["slider.tsx"],
  a11y:
    'Each thumb is a role="slider" with arrow keys, Home/End and Page Up/Down. The name is ' +
    "forwarded onto the thumbs, since the root has no role — a range slider should name each " +
    "thumb separately with thumbLabels. A development-only warning fires if a thumb would be " +
    "unnamed. Pass aria-valuetext when the raw number is not meaningful on its own " +
    "(a price, a duration). Show the current value on screen too — a slider is imprecise, so " +
    "pair it with a numeric input when exactness matters.",
});
