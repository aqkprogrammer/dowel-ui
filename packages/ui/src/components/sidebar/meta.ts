import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "sidebar",
  title: "Sidebar",
  description:
    "The application's own navigation: a collapsible rail on a wide screen, an overlay on a narrow one.",
  category: "navigation",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: ["sheet"],
  files: ["sidebar.tsx"],
  a11y:
    "The navigation landmark must be named — a page has several, and three regions all called " +
    '"navigation" is a list nobody can choose from. The active entry carries aria-current=' +
    '"page" rather than only a background colour. On a narrow screen it is a Sheet, not a ' +
    "styled div: an overlay needs a focus trap and an Escape key, and without them the page " +
    "behind stays reachable by Tab while the menu covers it. When the rail collapses, labels " +
    "are visually hidden rather than removed — removing them leaves controls whose only content " +
    "is an icon, which is how a collapsed sidebar becomes a column of links all announced as " +
    '"link". The trigger says what pressing it will do, not what the state currently is. The ' +
    "overlay is mounted only on a narrow screen and has its own open state: a modal dialog that " +
    "CSS hides is still modal, and mounting it always made every wide screen aria-hidden and " +
    "unclickable whenever the rail was open.",
});
