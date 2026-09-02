import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-agent-plan",
  title: "AI Agent Plan",
  description: "What an agent intends to do — including when it changes its mind mid-run.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["ai-agent-plan.tsx"],
  a11y:
    "An ordered list, because a plan is a sequence and the order carries meaning an unordered " +
    'list would discard. The running step carries aria-current="step", which marks the reader\'s ' +
    "place without moving focus and fighting anyone reading ahead. Every status is stated in text " +
    "as well as drawn, and the markers are aria-hidden so the status is not heard twice per step. " +
    "The live region reports structural revisions only — announcing every status transition would " +
    "talk over the reader continuously on a plan of any length.",
});
