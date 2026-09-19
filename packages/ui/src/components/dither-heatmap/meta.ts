import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dither-heatmap",
  title: "Dither Heatmap",
  description:
    "A rows × columns intensity grid drawn in dithered tiles that morph between periods, with a keyboard-navigable cell readout.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["dither-heatmap.tsx"],
  a11y:
    'The plot is role="img" with an aria-label giving its size, total and peak. Over it sits a ' +
    'role="grid" of real gridcells with one roving tab stop: arrow keys move a cell, Home/End go ' +
    "to the row's ends, Ctrl+Home/End to the corners, Escape hides the readout. Each cell's text " +
    "is its readout, so focus announces what the pointer tooltip shows. Axis labels and the scale " +
    "legend are aria-hidden; the data is always in a table, visually hidden unless showTable is set.",
});
