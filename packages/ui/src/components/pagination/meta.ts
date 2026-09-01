import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "pagination",
  title: "Pagination",
  description: "Navigation between pages of a list.",
  category: "navigation",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: ["button"],
  files: ["pagination.tsx"],
  a11y:
    'A named nav landmark. The current page carries aria-current="page" — styling it ' +
    "differently conveys nothing on its own. Links by default, since a page of results is a " +
    "place worth sharing; use asChild for your router's link, or render buttons when paging " +
    "only changes client state.",
});
