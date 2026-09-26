import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "prompt-redactor",
  title: "Prompt Redactor",
  description:
    "A privacy check before a prompt is sent: emails, card numbers and API keys swapped for placeholders, and put back in the reply.",
  category: "ai",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["prompt-redactor.tsx", "redact.ts"],
  a11y:
    "The count of what will be replaced is a polite status region, present and empty from first paint, so the " +
    "first finding is announced while the person is still typing — not at the moment they press send. Each " +
    'finding is named in words ("Card number", "card ending 4242") and never shown in full, with the ' +
    'placeholder it will be sent as. "Send as typed" is a toggle button whose accessible name includes what ' +
    'it applies to. Keeping a secret adds a written warning. "What will be sent" is a native disclosure. The ' +
    "panel is only a named region while it has findings, so an empty one adds nothing to the landmarks, and it " +
    "is data-agent-ui, so using it never takes over an agent surface.",
});
