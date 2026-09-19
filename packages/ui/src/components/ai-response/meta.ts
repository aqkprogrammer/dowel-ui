import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-response",
  title: "AI Response",
  description: "Assistant response text, with a streaming caret and a thinking indicator.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: ["ai-sources"],
  files: ["ai-response.tsx", "response-text.tsx"],
  a11y:
    "Deliberately not a live region: announcing streamed text as it arrives interrupts a screen " +
    "reader user on every token. Announce state through ConversationStatus and let them read the " +
    "response when it settles. The caret is decorative; ThinkingIndicator carries a label because " +
    "it is the only thing on screen while waiting for the first token, and it slows rather than " +
    "stops under reduced motion because a frozen one says the app has hung. ResponseText blurs " +
    "in only newly arrived words, adds no live region, and leaves the text content unchanged; " +
    "its [n] markers are InlineCitations named by their source title.",
});
