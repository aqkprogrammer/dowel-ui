import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "contribution-graph",
  title: "Contribution Graph",
  description:
    "A GitHub-style year heatmap of daily counts — a keyboard-navigable grid with a tooltip per day.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["tooltip"],
  files: ["contribution-graph.tsx"],
  a11y:
    'A table with role="grid", named by its caption ("1,234 contributions in 2025" or `label`). Weekdays are row ' +
    "headers and months column headers; every day is a gridcell whose screen-reader text states the count and the " +
    "full date, so colour never carries the value. One day is tabbable (roving tabindex): arrows move by day and " +
    "week (mirrored in RTL), Home/End to the ends of the weekday row, Ctrl+Home/End to the ends of the year, " +
    "PageUp/PageDown by four weeks. The tooltip follows keyboard focus as well as hover and Escape dismisses it.",
});
