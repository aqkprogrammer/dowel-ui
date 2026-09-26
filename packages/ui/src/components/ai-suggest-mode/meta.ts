import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-suggest-mode",
  title: "AI Suggest Mode",
  description:
    "Track changes for an agent's edits to text: every change shown in place with its reason, accepted or rejected on its own.",
  category: "ai",
  status: "beta",
  dependencies: ["diff"],
  registryDependencies: ["agent-surface"],
  files: ["ai-suggest-mode.tsx", "suggest-hunks.ts"],
  a11y:
    'A named section. In the text, each waiting change is a link whose name says it in words — "Suggestion 2: ' +
    'Replace “teh” with “the”" — because not every screen reader announces del and ins; following it moves to ' +
    "that suggestion's controls. The suggestions are an ordered list, each with its description, the agent's " +
    "reason and its status in words; Accept, Reject and Undo are described by the suggestion they act on. After a " +
    "decision focus moves to the next suggestion still waiting, then to a summary once none are, so a keyboard " +
    "review never drops to the page. A and R decide the focused suggestion (aria-keyshortcuts). The waiting count " +
    "is a polite status present from first paint. Colour marks insertions and deletions but never carries them " +
    "alone.",
});
