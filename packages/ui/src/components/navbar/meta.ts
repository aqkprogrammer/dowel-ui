import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "navbar",
  title: "Navbar",
  description:
    "A site header — brand, navigation, actions and a mobile menu — that is static, sticky or hides on scroll, flat at the top and lifted over content.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["navbar.tsx"],
  a11y:
    "A <header> landmark with a skip link (NavbarSkipLink) that appears on focus. Put the navigation inside a " +
    '<nav> with a label. With behavior="hide-on-scroll" it never hides while it holds keyboard focus or its ' +
    "menu is open, so a keyboard user always sees where they are. The mobile menu is a disclosure: a button with " +
    "aria-expanded and aria-controls; Escape closes it and returns focus to the button, and following a link " +
    "closes it.",
  guidance: {
    useWhen: [
      "the top bar of a marketing site, docs site or landing page",
      "a header that should get out of the way on long pages (hide-on-scroll)",
    ],
    avoidWhen: [
      "an application's chrome — use sidebar or rail-nav",
      "phone-only primary navigation — use bottom-nav",
    ],
    alternatives: ["navigation-menu", "sidebar", "bottom-nav"],
  },
  composesWith: ["navigation-menu", "button", "theme-toggle"],
});
