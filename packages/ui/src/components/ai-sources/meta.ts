import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-sources",
  title: "AI Sources",
  description: "Inline citation markers and the source list they refer to.",
  category: "ai",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: ["tooltip"],
  files: ["ai-sources.tsx"],
  a11y:
    "An inline marker shows a bare number, which conveys nothing on its own, so the source title " +
    "is carried in its accessible name. A marker with no href renders as text rather than as a " +
    "link that goes nowhere. The source list is ordered, because the marker numbers refer to " +
    "positions in it. The optional citation preview is a Radix Tooltip: it opens on hover and on " +
    "keyboard focus, Escape closes it, and it describes the link (host and excerpt) only while " +
    'open. Favicon stacks and marks are decorative and hidden; give an <img> favicon alt="".',
});
