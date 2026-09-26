import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "agent-ledger",
  title: "Agent Ledger",
  description:
    "What the agent did on a surface, with an undo for each call whose tool registered one — and the agent told what was undone.",
  category: "ai",
  status: "experimental",
  dependencies: [],
  registryDependencies: ["agent-surface", "ai-action-ledger"],
  files: ["agent-ledger.tsx"],
  a11y:
    "An ai-action-ledger: a real list named for what it holds, native checkboxes labelled by what each call " +
    "did, and reversibility stated in words on every entry. By default it lists only calls worth reverting, so " +
    "nothing claims an undo it does not have and no view change is described as permanent. Undo outcomes are " +
    "announced by the surface's status region; a failed undo shows its reason on the entry. Arguments are a " +
    "focusable, named region, since they scroll. The ledger is data-agent-ui, so using it never takes over " +
    "the surface.",
});
