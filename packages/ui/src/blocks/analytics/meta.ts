import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "analytics",
  kind: "block",
  title: "Analytics",
  description:
    "An analytics page: headline metrics against the previous period, a series over time, and the breakdown that made it up.",
  category: "data",
  status: "stable",
  dependencies: [],
  registryDependencies: ["button", "card", "metric-delta", "select", "table"],
  files: ["analytics.tsx"],
  a11y:
    "The bars are declared as a single image with a one-sentence summary — where the series " +
    "started, where it ended, and where its extremes were — rather than as forty separately " +
    "labelled elements, which reads as noise instead of a shape. The exact numbers live in a " +
    "real table that is collapsed for everyone and revealed for everyone from a control on the " +
    "page, rather than in a visually-hidden copy only screen readers can reach, because the " +
    "hidden copy is the one that goes stale. The range selector is a select rather than a tab " +
    "set: tabs promise panels, and a range selector has none — it changes the data behind the " +
    "whole page, so styled-as-tabs it points every tab at a panel that does not exist.",
});
