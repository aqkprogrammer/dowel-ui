import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "command-bar",
  title: "Command Bar",
  description:
    "A compact one-row prompt bar — auto-growing field, dictate toggle and send — composed from AI Prompt Input.",
  category: "ai",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["ai-prompt-input"],
  files: ["command-bar.tsx"],
  a11y:
    "Inherits AI Prompt Input's behaviour: Enter sends, Shift+Enter adds a newline, never mid-IME-composition, " +
    'and the submit control renames itself to "Stop" while sending. The field is named by `label`. Send is ' +
    "disabled while the field is empty. Dictate is a toggle button (aria-pressed); the consumer owns the microphone.",
});
