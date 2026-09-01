import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "admin-users",
  kind: "block",
  title: "Admin — users",
  description: "A team administration table with filtering, sorting and per-row actions.",
  category: "data",
  status: "stable",
  dependencies: ["@tanstack/react-table"],
  registryDependencies: [
    "avatar",
    "badge",
    "button",
    "data-table",
    "dropdown-menu",
    "empty-state",
    "input",
    "label",
  ],
  files: ["admin-users.tsx"],
  a11y:
    "Filtering changes the results without the user asking, so the matching count is announced " +
    "politely. The filter has a real label rather than only a placeholder, which disappears the " +
    "moment anyone types. Each row's action button is named after its row — four identical " +
    '"Actions" buttons say nothing about which row you are on.',
});
