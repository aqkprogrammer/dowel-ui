import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-chat",
  kind: "block",
  title: "AI Chat",
  description:
    "A complete chat surface: transcript, reasoning, tool calls, sources and composer.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: [
    "ai-conversation",
    "ai-message",
    "ai-model-selector",
    "ai-prompt-input",
    "ai-reasoning",
    "ai-response",
    "ai-sources",
    "ai-token-usage",
    "ai-tool",
    "button",
    "empty-state",
  ],
  files: ["ai-chat.tsx"],
  a11y:
    "Assembled from the AI components rather than reimplementing them, so their decisions still " +
    "hold: the transcript is a list and not a live region, state is announced separately through " +
    "ConversationStatus, and the composer will not send while an IME composition is active. Tool " +
    "payloads are named per tool, so two open tool calls do not present two regions called " +
    '"Result".',
});
