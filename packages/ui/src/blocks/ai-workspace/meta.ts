import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-workspace",
  kind: "block",
  title: "AI workspace",
  description:
    "A whole AI application surface: conversations down one side, the active transcript with reasoning, tool calls and sources in the middle, and the context — window usage, attachments and a structured result — on the other.",
  category: "ai",
  status: "stable",
  access: "pro",
  dependencies: [],
  registryDependencies: [
    "ai-conversation",
    "ai-message",
    "ai-model-selector",
    "ai-prompt-input",
    "ai-reasoning",
    "ai-response",
    "ai-sources",
    "ai-structured-output",
    "ai-token-usage",
    "ai-tool",
    "button",
    "empty-state",
    "sidebar",
  ],
  files: ["ai-workspace.tsx"],
  a11y:
    "Three landmarks, each named: the conversation list is a navigation called Conversations, " +
    "the transcript is the main content, and the context is a complementary region called " +
    "Context, so a screen reader user can jump between them and skip the one they do not want. " +
    "The transcript is a list and never a live region; the response state is announced from a " +
    "separate status line, so a streaming answer does not read itself aloud token by token. " +
    "Each attachment's remove button is named after its file. On a narrow screen the " +
    "conversation list becomes a sheet with a focus trap and an Escape key, not a div slid " +
    "over content that stays reachable by Tab.",
});
