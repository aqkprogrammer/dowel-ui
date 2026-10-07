import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "admin-dashboard",
  kind: "block",
  title: "Admin dashboard",
  description:
    "An administration console: the shell every admin page shares — navigation, breadcrumb, account menu — and the overview that is its front page, with what needs attention first.",
  category: "layout",
  status: "stable",
  access: "pro",
  dependencies: [],
  registryDependencies: [
    "alert",
    "avatar",
    "badge",
    "breadcrumb",
    "button",
    "card",
    "dropdown-menu",
    "empty-state",
    "metric-delta",
    "sidebar",
    "table",
  ],
  files: ["admin-dashboard.tsx"],
  a11y:
    "What needs attention comes first and is the only loud part of the page; it is not a live " +
    "region, because the list is there on load and re-announcing it on every refresh would " +
    "make the console unusable. The navigation is a landmark called Admin, the breadcrumb " +
    "another, so neither is one more thing called 'navigation'. The current page carries " +
    "aria-current, a count beside a nav item says what it counts, the account menu is named " +
    "after its owner, and each Open button is named after its account. Every status is a word, " +
    "with colour agreeing rather than replacing.",
  guidance: {
    useWhen: [
      "the shell and front page of an admin area: navigation, breadcrumb, account menu",
      "an admin overview that leads with what needs attention",
    ],
    avoidWhen: ["a simple overview of metrics and recent activity — use dashboard"],
    alternatives: ["dashboard", "analytics", "command-center"],
  },
});
