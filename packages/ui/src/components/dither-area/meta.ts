import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dither-area",
  title: "Dither Area",
  description:
    "An area chart filled with dithered cells over a cell grid, with a date scrubber that swells the cells around it.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["dither-area.tsx"],
  a11y:
    'The plot is role="img" with an aria-label giving the range, start, end and peak. The scrubber ' +
    "over it is a slider: arrow keys step a point, Page keys jump a tenth, Home/End go to the ends, " +
    "Escape hides the cursor, and aria-valuetext announces the date and value shown in the readout. " +
    "Axis ticks are aria-hidden; the data is always in a table, visually hidden unless showTable is set.",
});
