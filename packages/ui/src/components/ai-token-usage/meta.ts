import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-token-usage",
  title: "AI Token Usage",
  description: "A gauge showing how much of the context window a conversation has used.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["ai-token-usage.tsx"],
  a11y:
    "The numbers are the content and the bar only summarises them, so the bar is aria-hidden " +
    "rather than a second progressbar to read past. Counts are formatted for the locale. Warning " +
    "and over-limit states change the wording's colour but never remove the figures.",
});
