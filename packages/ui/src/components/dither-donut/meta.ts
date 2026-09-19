import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dither-donut",
  title: "Dither Donut",
  description:
    "A donut chart drawn in shimmering dithered cells, with wedges that pop out and sparkle on hover, focus or pin.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["dither-donut.tsx"],
  a11y:
    'The plot is role="img" with an aria-label summarising every entry, its share and the total. ' +
    "Legend entries are buttons named with their value and share: focus or hover previews a wedge, " +
    "and pressing pins it (aria-pressed). The data is always in a table, visually hidden unless " +
    "showTable is set. The readout is real text. Under reduced motion the shimmer stops and data " +
    "changes settle in one frame.",
});
