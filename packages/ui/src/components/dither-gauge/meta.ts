import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dither-gauge",
  title: "Dither Gauge",
  description:
    "A half-circle gauge drawn in dithered cells, one sweeping ring per metric, with a centre reading and metric switch.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["dither-gauge.tsx"],
  a11y:
    'The rings are role="img" with an aria-label listing every metric\'s reading. The centre ' +
    'reading is a role="meter" with aria-valuemin, aria-valuemax, aria-valuenow and a formatted ' +
    "aria-valuetext. With several metrics, legend buttons (named with label and reading) preview a " +
    "ring on hover or focus and choose the centre's metric when pressed (aria-pressed). The data is " +
    "always in a table, visually hidden unless showTable is set.",
});
