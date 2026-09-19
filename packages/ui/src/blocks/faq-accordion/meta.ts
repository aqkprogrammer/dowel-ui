import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "faq-accordion",
  kind: "block",
  title: "FAQ Accordion",
  description: "Frequently asked questions as bordered cards, one answer open at a time.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["accordion"],
  files: ["faq-accordion.tsx"],
  a11y:
    "A section named by its heading. Each question is the accordion's button inside a heading, so " +
    "questions are reachable by heading navigation, carry aria-expanded, and arrow keys move between " +
    "them. The staggered entrance only hides a list that starts below the fold, and never under " +
    "reduced motion.",
});
