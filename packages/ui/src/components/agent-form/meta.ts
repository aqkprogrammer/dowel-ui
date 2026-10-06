import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "agent-form",
  title: "Agent Form",
  description:
    "A form an agent can fill in, read back and submit through the form's own handler — its fields read from the form, private ones never touched.",
  category: "ai",
  status: "experimental",
  dependencies: [],
  registryDependencies: ["agent-surface", "form"],
  files: ["agent-form.tsx", "form-fields.ts"],
  a11y:
    "Adds no controls. Fields are described to the agent from their accessible names and descriptions, so a " +
    "field with no label is as unclear to the agent as to a screen reader user — the form's accessibility is " +
    "what the agent works from. Values are set through the same input and change events typing fires, so " +
    "validation messages, live regions and aria-invalid respond to the agent exactly as they do to a person, " +
    "and the errors the agent is told are the ones on screen. A field the agent fills is outlined while it " +
    "works, and focus never moves. Passwords, one-time codes, card numbers and anything inside " +
    "[data-agent-private] are never read or filled.",
  guidance: {
    useWhen: [
      "a form an agent can fill in, read back and submit through its own handler",
      "agent-assisted forms where passwords, codes and card numbers stay the person's",
    ],
    avoidWhen: ["proposing values for a person to accept one by one — use ai-suggested-value"],
    alternatives: ["ai-suggested-value", "form"],
  },
  composesWith: ["agent-approvals"],
});
