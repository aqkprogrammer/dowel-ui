import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dashboard",
  kind: "block",
  title: "Dashboard",
  description: "An overview page with headline metrics and a recent activity feed.",
  category: "data",
  status: "stable",
  dependencies: [],
  registryDependencies: ["activity-feed", "badge", "card", "skeleton"],
  files: ["dashboard.tsx"],
  a11y:
    'Each metric states its change in words — "up 12.4%" — rather than by a coloured arrow, ' +
    "which is unreadable to a screen reader and ambiguous to anyone who cannot distinguish the " +
    "colours. Whether a rise is good is configurable, since churn going up is not. The metrics " +
    "sit in a named region so they can be jumped to.",
});
