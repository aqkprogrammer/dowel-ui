import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "social-selector",
  title: "Social Selector",
  description:
    "Pick a social platform from a row of icons — a pill slides behind the choice and the caption links to the profile.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["social-selector.tsx"],
  a11y:
    "A Radix radio group named by `label`: one tab stop, arrow keys move and select (following the reading " +
    "direction), and the value submits with a form under `name`. Each icon-only radio is named by the platform's " +
    "`name`; icons and the sliding pill are aria-hidden. Caption links say when they open in a new tab. The " +
    "pill's slide and the caption's blur-in stop under reduced motion.",
});
