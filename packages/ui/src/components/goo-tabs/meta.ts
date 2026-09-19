import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "goo-tabs",
  title: "Goo Tabs",
  description:
    "Dowel Tabs with a motion flourish: an icon bar whose pill stretches over the old and new tab, then snaps onto the new one, melted together by an SVG goo filter.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["tabs"],
  files: ["goo-tabs.tsx"],
  a11y:
    'A thin composition on Dowel\'s Tabs (Radix): role="tablist" (name it with aria-label) with one tab stop, arrow keys ' +
    "along the orientation that follow the reading direction, Home/End, wrap-around and automatic activation; tabs carry " +
    "aria-selected and aria-controls, and panels are focusable. Icon-only tabs must be named with aria-label and warn in " +
    "development when they are not; icons are decoration. The pill, trailing blob and goo filter are one aria-hidden layer " +
    "that ignores the pointer, and the filter never applies to the icons. Under reduced motion (or without SVG filter " +
    "support, or with goo={false}) the goo is dropped and the pill moves straight to the new tab.",
});
