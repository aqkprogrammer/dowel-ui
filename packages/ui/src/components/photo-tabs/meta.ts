import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "photo-tabs",
  title: "Photo Tabs",
  description: "A photo with a floating bar of icon tabs; each tab swaps the photo.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["tabs"],
  files: ["photo-tabs.tsx"],
  a11y:
    "Built on Dowel's Tabs: the ARIA tabs pattern with roving focus, arrow keys, Home/End and focusable panels. " +
    "The tab list is named by `listLabel`; each icon-only tab carries its label as visually hidden text and the " +
    "icon is aria-hidden. Each panel's image has alt text (defaulting to the label). With a fine pointer the bar " +
    "hides until the photo is hovered or anything inside it has focus, so keyboard users always see it; on touch " +
    "it is always visible. The hover pill is aria-hidden and its movement stops under reduced motion.",
});
