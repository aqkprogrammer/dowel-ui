import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-message",
  title: "AI Message",
  description: "One turn in a conversation, with role, avatar, actions and footer slots.",
  category: "ai",
  status: "stable",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["ai-message.tsx"],
  a11y:
    "Every message carries a visually hidden label naming the speaker. Alignment and colour tell " +
    "a sighted reader who is talking and tell a screen reader user nothing, so the role is always " +
    "in text. Message actions fade in on hover but stay in the DOM and in the tab order — a " +
    "control that only exists on hover is unreachable by keyboard and invisible on touch.",
});
