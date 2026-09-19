import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dither-meter",
  title: "Dither Meter",
  description:
    "A capacity bar drawn in dithered cells, split into categories that fill with a spring, with a category legend.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["dither-meter.tsx"],
  a11y:
    'The bar is a role="meter" named by label, with used over capacity as aria-valuenow / ' +
    "aria-valuemax and the per-category breakdown as aria-valuetext (or `description`). Legend " +
    "entries are buttons, named with category and value, that preview a segment on hover or focus " +
    "and pin it when pressed (aria-pressed). The visible used-of-capacity line is aria-hidden as it " +
    "repeats the meter. The data is always in a table, visually hidden unless showTable is set.",
});
