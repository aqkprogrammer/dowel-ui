import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "message-thread",
  title: "Message Thread",
  description:
    "A compact chat thread whose sent bubbles lift out of the field while older messages glide up.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["message-thread.tsx"],
  a11y:
    'The thread is role="log", named "Messages", so new messages are announced politely as they arrive, and it is ' +
    'focusable so the history can be scrolled from the keyboard. Every bubble begins with visually hidden "You:" or ' +
    '"<contactName>:", so the sender never depends on colour or side, and the typing indicator says "<contactName> is ' +
    'typing" in words with its dots aria-hidden. The field is named by its placeholder and submits on Enter; the send ' +
    'button is named "Send" and is disabled while the field is empty. Layout is logical, so the sides swap in ' +
    "right-to-left languages. Under reduced motion messages appear without the lift and the typing dots stay still.",
  guidance: {
    useWhen: [
      "a small conversational surface such as a support widget, a preview of a chat, or an onboarding demo",
    ],
    avoidWhen: [
      "an AI assistant conversation with streaming and tools — use ai-conversation",
      "long threads with history paging, attachments or reactions",
    ],
    alternatives: ["ai-conversation", "comment-bubble", "activity-feed"],
  },
});
