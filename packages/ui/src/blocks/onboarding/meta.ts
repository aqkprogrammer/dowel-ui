import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "onboarding",
  kind: "block",
  title: "Onboarding",
  description:
    "A setup checklist: what is done, which step is current, and what is blocked and why.",
  category: "feedback",
  status: "stable",
  dependencies: [],
  registryDependencies: ["badge", "button", "card", "progress"],
  files: ["onboarding.tsx"],
  a11y:
    "Every step states its state in a word — Done, In progress, Not started, Blocked — because " +
    "a green tick announces nothing and means nothing to a reader who cannot tell the colours " +
    "apart; the tick and the step number are decoration on top of that. Progress is given as a " +
    "count rather than only as a bar, and the bar is hidden so the same fact is not announced " +
    "twice. The current step carries aria-current, so it can be found rather than merely seen. " +
    "Blocked is a distinct state from not-started and says why. Each step's action is named " +
    'after its step, so six buttons are not six identical "Start" entries in a controls list.',
});
