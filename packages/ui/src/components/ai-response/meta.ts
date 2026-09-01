import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-response",
  title: "AI Response",
  description: "Assistant response text, with a streaming caret and a thinking indicator.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["ai-response.tsx"],
  a11y:
    "Deliberately not a live region: announcing streamed text as it arrives interrupts a screen " +
    "reader user on every token. Announce state through ConversationStatus and let them read the " +
    "response when it settles. The caret is decorative; ThinkingIndicator carries a label because " +
    "it is the only thing on screen while waiting for the first token.",
});
