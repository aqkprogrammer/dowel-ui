import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "navigation-menu",
  title: "Navigation Menu",
  description:
    "Site navigation whose top-bar items open menus — a short list of links, or a full mega menu — with hover intent and full keyboard support.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["navigation-menu.tsx"],
  a11y:
    "Built on Radix NavigationMenu: a nav landmark whose triggers are buttons with aria-expanded and " +
    "aria-controls. Arrow keys move along the bar, Enter or Space opens a panel, Tab moves into it, Escape " +
    "closes it and returns focus to its trigger. Mark the current page's link with `active`, which sets " +
    'aria-current="page". Give the root an aria-label when a page has more than one navigation. Panels grow ' +
    "from their trigger with the theme's float animations, which reduced motion collapses.",
  guidance: {
    useWhen: [
      "a marketing site header with grouped product links",
      "a mega menu of product areas, resources and a featured item",
    ],
    avoidWhen: [
      "an application's own navigation — use sidebar",
      "a menu of actions — use dropdown-menu",
    ],
    alternatives: ["dropdown-menu", "sidebar", "navbar"],
  },
  composesWith: ["navbar", "letter-swap"],
});
