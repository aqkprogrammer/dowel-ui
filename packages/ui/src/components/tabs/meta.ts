import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "tabs",
  title: "Tabs",
  description: "Switches between panels of related content.",
  category: "navigation",
  status: "stable",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["tabs.tsx"],
  a11y:
    "Implements the ARIA tabs pattern: arrows move between tabs, Home/End jump to the ends, " +
    "and only the active tab is in the tab sequence. Panels are focusable so keyboard users " +
    'reach their content directly. Use activationMode="manual" when showing a panel is ' +
    "expensive, so arrowing past it does not load it.",
});
