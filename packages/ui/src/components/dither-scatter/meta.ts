import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dither-scatter",
  title: "Dither Scatter",
  description:
    "A bubble scatter drawn in dithered cells: floating bubbles sized by value that glide between data sets, with a per-point readout.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["dither-scatter.tsx"],
  a11y:
    'The plot is role="img" with an aria-label listing every point\'s x, y and size. Each bubble ' +
    "is a button over the plot, its visible short label first in a name that carries all three " +
    "values; hover or focus shows the readout and pressing pins it (aria-pressed). The float " +
    "stops under reduced motion. The data is always in a table, visually hidden unless showTable " +
    "is set.",
});
