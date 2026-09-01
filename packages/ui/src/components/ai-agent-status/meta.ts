import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-agent-status",
  title: "AI Agent Status",
  description: "A pill showing what an agent is doing, in words as well as colour.",
  category: "ai",
  status: "stable",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["ai-agent-status.tsx"],
  a11y:
    "The state is always text. Agent states matter most when something has failed, which is " +
    "exactly when a colour-only signal fails the people who most need to see it. Live " +
    "announcements are off by default — several agents each announcing their transitions turns a " +
    "dashboard into noise; enable it for the one agent being watched.",
});
