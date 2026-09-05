import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "crm",
  kind: "block",
  title: "CRM",
  description:
    "A sales pipeline: open value by stage, the deals in it with filtering and sorting, the win rate and cycle length, and the last few touches.",
  category: "data",
  status: "stable",
  access: "pro",
  dependencies: ["@tanstack/react-table"],
  registryDependencies: [
    "activity-feed",
    "avatar",
    "badge",
    "button",
    "card",
    "data-table",
    "empty-state",
    "input",
    "label",
    "meter",
    "metric-delta",
    "select",
  ],
  files: ["crm.tsx"],
  a11y:
    "The pipeline is one bar split by stage, with the same figures listed beside it as numbers, " +
    "so nobody reads a proportion off a coloured segment; the meter announces the total and its " +
    "legend names every stage. Sales cycle is declared lower-is-better, so a slowing pipeline is not painted " +
    "green. The deal filter has a real label and announces the matching count politely, and " +
    "each Open button is named after its deal rather than being one of ten identical buttons.",
});
