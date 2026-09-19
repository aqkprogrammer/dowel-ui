import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "hero-minimal",
  kind: "block",
  title: "Hero minimal",
  description:
    "A quiet hero: a headline whose letters draw together, one line of copy and a text link.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button"],
  files: ["hero-minimal.tsx"],
  a11y:
    "One section landmark named by its headline, whose level is a prop. The link is a real link " +
    "with a visible underline, not colour alone, and its arrow mirrors in right-to-left text. " +
    "The fade and letter-spacing entrance play once, on first scroll into view, and settle " +
    "instantly under reduced motion.",
});
