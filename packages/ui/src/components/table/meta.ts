import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "table",
  title: "Table",
  description: "Semantic table primitives for tabular data.",
  category: "data",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["table.tsx"],
  a11y:
    "A native table, so row and column position, header association and dimensions are all " +
    "announced without ARIA. Give it a name with TableCaption or aria-label. The scrolling " +
    "wrapper is focusable so an overflowing table can be scrolled by keyboard — without that, " +
    'columns past the edge are unreachable. Use scope="row" on th elements inside tbody.',
});
