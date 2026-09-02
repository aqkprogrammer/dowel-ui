import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-action-ledger",
  title: "AI Action Ledger",
  description: "What an agent actually did, classified by what can be undone.",
  category: "ai",
  status: "stable",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["ai-action-ledger.tsx"],
  a11y:
    "Reversibility is stated in words on every entry, never by colour or icon alone — it decides " +
    "whether the undo control means anything, so it cannot be decoration. Selection uses native " +
    "checkboxes with real labels, and the revert button carries the count in its accessible name " +
    "so it says what pressing it will do. The selection summary is an aria-live region because " +
    "the wording changes as the choice changes, and warns before the click when something can " +
    "only be offset rather than undone.",
});
