import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "tab-bar",
  title: "Tab Bar",
  description:
    "A pill of icon tabs whose bright highlight slides to the chosen tab and stretches, gooey, in transit.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["tab-bar.tsx"],
  a11y:
    'Built on the Radix radio group: role="radiogroup" with one role="radio" per tab, each named by its `label` ' +
    "because the icons are aria-hidden. Roving focus moves with the arrow keys (mirrored in right-to-left layouts), " +
    "Space selects, and the focused tab shows a focus ring. Name the bar with aria-label. The selected tab is also " +
    "marked by its icon colour against the highlight. Under reduced motion the highlight jumps without stretching.",
  guidance: {
    useWhen: ["switching between a handful of app sections from a compact, icon-only bar"],
    avoidWhen: [
      "each tab is a link to its own page — use bottom-nav",
      "the options need visible text — use segmented-pill or tabs",
    ],
    alternatives: ["bottom-nav", "goo-tabs", "gooey-nav", "tabs"],
  },
});
