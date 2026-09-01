import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-sources",
  title: "AI Sources",
  description: "Inline citation markers and the source list they refer to.",
  category: "ai",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["ai-sources.tsx"],
  a11y:
    "An inline marker shows a bare number, which conveys nothing on its own, so the source title " +
    "is carried in its accessible name. A marker with no href renders as text rather than as a " +
    "link that goes nowhere. The source list is ordered, because the marker numbers refer to " +
    "positions in it.",
});
