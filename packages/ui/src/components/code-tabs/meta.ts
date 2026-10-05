import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "code-tabs",
  title: "Code Tabs",
  description:
    "Tabs of code snippets — pnpm, npm, yarn, bun — with a springing indicator, a blur cross-fade, a panel that eases to each snippet's height, and a syncKey that switches every instance on the page together and remembers the choice.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: ["code-block", "copy-button", "tabs"],
  files: ["code-tabs.tsx"],
  a11y:
    "Built on Dowel's Tabs, so it is the WAI-ARIA tabs pattern: a named tablist (listLabel), arrows and Home/End " +
    "move between tabs, and only the active tab is in the tab sequence. The panel itself is not a tab stop; the " +
    "code region inside it is — a focusable pre named by the tab's label, so horizontally overflowing code is " +
    "reachable by keyboard. The copy button always copies the visible snippet and announces success or failure " +
    "through a polite status region. The travelling indicator and tab glyphs are aria-hidden; selection is " +
    "conveyed by aria-selected. A synced change from another instance or browser tab moves the selection without " +
    "moving focus. Nothing animates on first paint, and under reduced motion the indicator, cross-fade and " +
    "height change are instant.",
});
