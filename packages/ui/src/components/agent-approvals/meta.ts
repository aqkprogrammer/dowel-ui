import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "agent-approvals",
  title: "Agent Approvals",
  description:
    "The approval step for an agent surface: correct the agent's arguments, approve once or for the session, or deny with a reason.",
  category: "ai",
  status: "experimental",
  dependencies: [],
  registryDependencies: ["agent-surface", "ai-approval-request"],
  files: ["agent-approvals.tsx"],
  a11y:
    "Each request is an ai-approval-request, so the arguments are labelled, editable fields and a correction " +
    "is marked in text. A polite status region, present from first paint, says the agent is waiting and for " +
    "what, because the agent is stopped until someone answers. One request is on screen at a time and the " +
    "count of those behind it is stated. Reversibility is a sentence above the decision, never a colour. " +
    "The whole region is data-agent-ui, so deciding never counts as taking over the surface. If it unmounts " +
    "with requests waiting, they are refused rather than left hanging.",
});
