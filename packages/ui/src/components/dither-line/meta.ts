import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dither-line",
  title: "Dither Line",
  description:
    "A smooth monotone line over a drifting dithered gradient fill, with a keyboard-operable point scrubber.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["dither-line.tsx"],
  a11y:
    'The plot is role="img" with an aria-label giving the range, high and low. The scrubber over ' +
    "it is a slider: arrow keys step a point, Page keys jump, Home/End go to the ends, Escape hides " +
    "the cursor, and aria-valuetext announces the point and value shown in the readout. The data is " +
    "always in a table, visually hidden unless showTable is set.",
});
