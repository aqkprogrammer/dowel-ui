import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "create-menu",
  title: "Create Menu",
  description:
    'A DropdownMenu with a morph flourish: a "+ Create" pill that grows in place into its menu panel.',
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["create-menu.tsx"],
  a11y:
    "Built directly on the Radix DropdownMenu primitive (not portalled, so the panel can grow over the " +
    'pill): the trigger exposes aria-haspopup="menu" and aria-expanded, the panel is a role="menu" named ' +
    'by the trigger, and items are role="menuitem". Opening from the keyboard moves focus to the first ' +
    "item; Up/Down move, Home/End jump, typeahead searches, Enter/Space select, Escape and an outside " +
    "press close and return focus to the trigger. The morphing surface and the highlight pill are " +
    "aria-hidden; the pill follows data-highlighted, so pointer and keyboard never disagree. The grow, " +
    "stagger and pill slide are decoration and settle instantly under reduced motion.",
});
