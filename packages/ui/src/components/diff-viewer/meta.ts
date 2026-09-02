import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "diff-viewer",
  title: "Diff Viewer",
  description: "A diff you can style, and accept or reject hunk by hunk.",
  category: "data",
  status: "stable",
  dependencies: ["diff"],
  registryDependencies: [],
  files: ["diff-model.ts", "diff-viewer.tsx"],
  a11y:
    'A semantic table, not a grid. role="grid" would promise cell-by-cell arrow navigation that ' +
    "does not exist here and makes no sense for reading code. Every row states added, removed or " +
    "unchanged in text, because a plus sign and a green tint are not information — a diff read " +
    "aloud without it is just the same file twice. Line numbers are aria-hidden: they orient a " +
    "sighted reader, and announcing two numbers before every line makes the diff unlistenable. " +
    "Changed words are marked with mark elements so they survive as structure, and the empty half " +
    "of a split pair is hidden rather than read as a blank line of code.",
});
