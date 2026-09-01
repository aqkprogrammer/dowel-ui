import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "data-table",
  title: "Data Table",
  description:
    "Presentation for a TanStack Table instance: sorting, column visibility and pagination.",
  category: "data",
  status: "stable",
  dependencies: ["@tanstack/react-table"],
  registryDependencies: ["button", "dropdown-menu", "select", "table"],
  files: ["data-table.tsx"],
  a11y:
    "Sortable headers carry aria-sort, so the current sort is announced rather than being " +
    "conveyed by an arrow icon alone, and each sort button has visually hidden text stating the " +
    "column and its direction. The pagination status is a polite live region, because paging " +
    "swaps the rows in place with no other signal. A column that cannot be sorted renders as " +
    "text, not as a button that does nothing.",
});
