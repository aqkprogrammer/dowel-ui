import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "site-header",
  kind: "block",
  title: "Site header",
  description:
    "A whole site header from one list: menus with a featured card on desktop, the same links grouped in the mobile menu.",
  category: "navigation",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button", "navbar", "navigation-menu"],
  files: ["site-header.tsx"],
  a11y:
    "Built on navbar (skip link, a mobile disclosure with Escape and focus return, never hidden while " +
    "focused) and navigation-menu (arrow keys along the bar, Escape to close, focus back to the trigger). " +
    "The desktop and mobile navigations are separate landmarks with their own names, driven by the same " +
    "list so they always agree. Mobile groups are lists named by their headings.",
  guidance: {
    useWhen: ["the header of a marketing site or docs, with menus for its sections"],
    avoidWhen: ["an application shell — use sidebar or rail-nav"],
    alternatives: ["navbar", "navigation-menu", "sidebar"],
  },
});
