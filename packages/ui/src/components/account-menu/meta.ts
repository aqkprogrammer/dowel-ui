import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "account-menu",
  title: "Account Menu",
  description:
    "An avatar that opens an account panel of collapsible sections — edit the profile, check recent orders.",
  category: "overlay",
  status: "beta",
  dependencies: [],
  registryDependencies: ["avatar", "button", "input", "label", "popover", "progress"],
  files: ["account-menu.tsx"],
  a11y:
    'The avatar trigger is named "Account menu for <name>" and opens Dowel\'s Popover: a role="dialog" labelled by ' +
    "the user's name, with focus moved inside, Escape and outside-press dismissal and focus returned to the " +
    'trigger. It is deliberately not role="menu": sections contain form fields. Each section is a disclosure ' +
    "button (aria-expanded, aria-controls) revealing a named region that is inert while collapsed. Form fields " +
    "are labelled; order progress bars and view buttons name their order. Transitions stop under reduced motion.",
});
