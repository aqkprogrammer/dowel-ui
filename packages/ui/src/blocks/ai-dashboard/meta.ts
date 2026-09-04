import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-dashboard",
  kind: "block",
  title: "AI dashboard",
  description:
    "What the AI features cost and whether they worked: tokens, spend, failure rate, a breakdown by model, and the runs still going.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: [
    "ai-agent-status",
    "ai-token-usage",
    "card",
    "empty-state",
    "metric-delta",
    "table",
  ],
  files: ["ai-dashboard.tsx"],
  a11y:
    "Spend and failure rate are declared lower-is-better, so a rising bill is not painted green " +
    "— which is the mistake most usage dashboards make. The totals row is a real table footer " +
    "rather than a last body row that looks like one, because inside the body it is announced " +
    "as another model and there is no model called Total. Statuses in the run list do not " +
    "announce their own changes: several runs each doing that turns a list into a stream of " +
    "interruptions, and watching one run is the agent console's job.",
});
