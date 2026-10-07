import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "badge",
  title: "Badge",
  description: "A compact marker for status, counts and categories.",
  category: "display",
  status: "stable",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["badge.tsx"],
  a11y:
    "The badge label must convey the meaning on its own; variant colour is decoration. " +
    "Use asChild to render an interactive badge as a link or button rather than adding handlers.",
  guidance: {
    useWhen: ["a compact status, count or category label beside content"],
    avoidWhen: [
      "an unread count pinned to an icon or avatar — use notification-badge",
      "what an agent is doing — use ai-agent-status",
    ],
    alternatives: ["notification-badge", "ai-agent-status"],
  },
});
