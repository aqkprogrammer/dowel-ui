import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "aspect-morph",
  title: "Aspect Morph",
  description:
    "A picture that smoothly reshapes between aspect ratios, picked from a segmented control with a sliding thumb.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["aspect-morph.tsx"],
  a11y:
    'The picker is a role="radiogroup" (named "Aspect ratio" unless `label` is given) of buttons with role="radio", ' +
    "aria-checked and a spoken name per shape; the outline icons and sliding thumb are aria-hidden. Roving tabindex: " +
    "Tab reaches the checked option, arrow keys move focus and select with wrap-around (Left/Right follow the reading " +
    'direction in RTL), Home/End jump to the ends. A `src` picture is role="img" named by `alt`, or hidden when no ' +
    "`alt` is given. The reshape and thumb are CSS transitions and snap to the final state under reduced motion.",
});
