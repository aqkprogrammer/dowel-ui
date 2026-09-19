import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dither-bar",
  title: "Dither Bar",
  description:
    "Stacked bars drawn in dithered cells that grow on change, with series highlighting on hover and a per-column readout.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["dither-bar.tsx"],
  a11y:
    'The plot is role="img" with an aria-label summarising every stack. Each column is a button ' +
    "named with its full breakdown and total; focus shows the readout and pressing pins it " +
    "(aria-pressed). Legend entries are buttons that preview a series on hover or focus and pin it " +
    "when pressed. The data is always in a table, visually hidden unless showTable is set. Series " +
    "are named in the legend and readout, never by colour alone.",
});
