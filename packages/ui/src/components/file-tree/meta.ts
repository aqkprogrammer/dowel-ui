import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "file-tree",
  title: "File Tree",
  description:
    "A file explorer tree whose folders tilt open, whose children unfold in a stagger beside a drawn guide rail, and whose selection glides from row to row.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["file-tree.tsx"],
  a11y:
    "Implements the WAI-ARIA tree pattern with nested markup: role=tree, treeitems that own a role=group of their " +
    "children, and aria-level, aria-posinset, aria-setsize, aria-expanded and aria-selected stated on every item. " +
    "One item is in the tab sequence at a time (roving tabindex). ArrowUp/ArrowDown move between visible items, " +
    "ArrowRight opens a folder or steps into it, ArrowLeft closes it or steps out to its parent, Home/End jump to " +
    "the ends, Enter/Space select (and toggle a folder), * opens every sibling folder and a printable character " +
    "jumps to the next item starting with it. The tree needs a name: pass aria-label or aria-labelledby. Status " +
    'is a coloured dot and a letter, and is also part of the item\'s name ("button.tsx, modified"; the words are ' +
    "overridable through statusLabels), so colour is never the only signal. Glyphs, guide rails and the travelling " +
    "highlight are aria-hidden. Nothing animates on first paint, and under reduced motion every spring, stagger " +
    "and tilt resolves instantly.",
});
