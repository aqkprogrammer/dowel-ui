import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "stats-trend-cards",
  kind: "block",
  title: "Stats trend cards",
  description:
    "Metric cards with an icon, a figure that rolls up from zero, a label, a line of context and a trend stated in words.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["badge", "card", "number-flow"],
  files: ["stats-trend-cards.tsx"],
  a11y:
    "One section landmark named by its heading (level set with `headingLevel`); the cards are a " +
    'description list. Trends are stated in words ("up 12%") with the arrow hidden, and ' +
    "`polarity` decides whether a rise is good news, so rising churn is never painted green. The " +
    "rolling digits are aria-hidden and the settled value is read once; icons are decorative. " +
    "The trend slides in from the inline start, mirrored on right-to-left pages; under reduced " +
    "motion everything appears at once.",
});
