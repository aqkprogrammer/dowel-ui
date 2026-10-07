import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-prompt-input",
  title: "AI Prompt Input",
  description: "The composer: auto-growing textarea, send-on-Enter, and a send/stop control.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["ai-prompt-input.tsx"],
  a11y:
    "Enter sends and Shift+Enter inserts a newline, but never while an IME composition is active " +
    "— for Japanese, Chinese and Korean input Enter confirms a candidate, and sending there " +
    'truncates the sentence mid-word. The submit control renames itself to "Stop generating" ' +
    "while busy, so its accessible name always matches what it does. The character counter stays " +
    "silent until it nears the limit; announcing every keystroke would be unusable.",
  guidance: {
    useWhen: [
      "the composer of a chat: auto-growing field, send on Enter, stop while responding",
    ],
    avoidWhen: [
      "a compact one-row prompt bar with dictation — use command-bar",
      "a multi-line form field — use textarea",
    ],
    alternatives: ["command-bar", "textarea"],
  },
  composesWith: ["ai-conversation", "ai-suggestions", "ai-model-selector", "prompt-redactor"],
});
