import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-tool",
  title: "AI Tool Call",
  description: "A collapsible record of a tool the model called, its arguments and its result.",
  category: "ai",
  status: "stable",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["ai-tool.tsx"],
  a11y:
    "A disclosure: the trigger exposes aria-expanded and controls the panel. Status is stated in " +
    "words, not by a coloured dot — colour alone is unavailable to a screen reader and to anyone " +
    "who cannot distinguish it. Payload blocks are focusable named regions, since JSON scrolls " +
    "and an unfocusable scroll box is unreachable by keyboard.",
});
