import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "contribution-graph",
  title: "Contribution Graph",
  description:
    "A GitHub-style heatmap of daily counts — a keyboard-navigable grid with a tooltip per day, and an optional footer panel that rises over it to rank top projects.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["avatar", "button", "tooltip"],
  files: ["contribution-graph.tsx", "contribution-graph-panel.tsx"],
  a11y:
    'A table with role="grid", named by its caption ("1,234 contributions in 2025", "… in the last 6 months", or ' +
    "`label`). Weekdays are row headers and months column headers; every day is a gridcell whose screen-reader text " +
    "states the count and the full date, so colour never carries the value. One day is tabbable (roving tabindex): " +
    "arrows move by day and week (mirrored in RTL), Home/End to the ends of the weekday row, Ctrl+Home/End to the " +
    "ends of the range, PageUp/PageDown by four weeks. The tooltip follows keyboard focus as well as hover and Escape " +
    "dismisses it. ContributionGraphPanel's chevron is a disclosure button (aria-expanded, aria-controls) named by the " +
    "footer label, which also names the ranked list; each row reads its name and count phrase, and its bar and " +
    "avatars are aria-hidden. While the panel is open the grid and legend under it are inert; while closed the panel " +
    "is inert and hidden. Escape closes it and returns focus to the chevron. Its motion is transform and opacity only " +
    "and collapses under reduced motion.",
});
