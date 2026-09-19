import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dither-funnel",
  title: "Dither Funnel",
  description:
    "A conversion funnel of dithered stage bars that morph between periods, with overall and step conversion per stage.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["dither-funnel.tsx"],
  a11y:
    'The bars are role="img" with an aria-label giving every stage\'s value and conversion. Each ' +
    "stage is a button over its bar, showing its name and overall conversion and named with the " +
    "full breakdown (share of the first stage, step conversion, drop-off); hover or focus fills " +
    "the text readout and pressing pins it (aria-pressed). The data is always in a table, visually " +
    "hidden unless showTable is set.",
});
