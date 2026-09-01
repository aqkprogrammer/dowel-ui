import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-conversation",
  title: "AI Conversation",
  description:
    "The scrolling transcript container, with follow-on-new-content and a status region.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["ai-conversation.tsx"],
  a11y:
    "The transcript is an ordered list, NOT a live region. A live region that updates on every " +
    "streamed token is unusable with a screen reader, and is the most common accessibility " +
    'failure in chat interfaces. Announce state — "generating", "response complete" — through ' +
    "ConversationStatus instead, and let the reader navigate the transcript at their own pace. " +
    "Auto-scroll stops the moment the reader scrolls up, and ConversationScrollButton is the " +
    "explicit way back.",
});
