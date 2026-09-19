import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "uptime-matrix",
  title: "Uptime Matrix",
  description:
    "A day-by-day status history drawn in dithered tiles — operational, degraded, outage — with a keyboard-navigable readout and legend.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["uptime-matrix.tsx"],
  a11y:
    'The tiles are role="img" with an aria-label counting each state and the average uptime. ' +
    'Over them sits a role="grid" of gridcells with one roving tab stop: arrow keys move a day, ' +
    "Home/End go to the row's ends, Ctrl+Home/End to the first and last day, Escape hides the " +
    "readout; each cell's text is its readout. State is never colour alone: degraded tiles are " +
    "striped, outages solid, and the legend, readout and table name every state. Axis labels are " +
    "aria-hidden; the data is always in a table, visually hidden unless showTable is set.",
});
