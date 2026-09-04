import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "agent-console",
  kind: "block",
  title: "Agent console",
  description:
    "One agent run, watched: the plan it is working from, the approval it is blocked on, and the ledger of what it has already done.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: [
    "ai-action-ledger",
    "ai-agent-plan",
    "ai-agent-status",
    "ai-approval-request",
    "ai-token-usage",
    "button",
    "card",
    "empty-state",
  ],
  files: ["agent-console.tsx"],
  a11y:
    "Whatever the run is blocked on is rendered first rather than below a scrolling plan, " +
    "because it is the only part of the page waiting on a person. This is the one agent on the " +
    "page, so its status announces its own transitions — a list of runs each doing that would " +
    "be noise, which is why the underlying component makes it opt in. Every completed action " +
    "states whether it can be undone, offset or not taken back at all, in words, since " +
    "presenting all three behind one Undo is a lie discovered after the click.",
});
