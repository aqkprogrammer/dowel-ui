import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "stats-grid",
  kind: "block",
  title: "Stats grid",
  description:
    "A heading over a row of big figures, each with a label and a line of context, whose digits roll up from zero as the row scrolls into view.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["card", "number-flow"],
  files: ["stats-grid.tsx"],
  a11y:
    "One section landmark named by its heading (level set with `headingLevel`). A stat is data, " +
    "not a heading, so the grid is a description list — label as term, figure as definition. " +
    "The rolling digits are aria-hidden and each figure's settled, locale-formatted value is " +
    "read once, so a screen reader never hears the zero the roll starts from. Only a row below " +
    "the fold is held back to animate; under reduced motion values appear at once.",
});
