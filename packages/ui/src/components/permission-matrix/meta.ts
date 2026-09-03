import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "permission-matrix",
  title: "Permission Matrix",
  description:
    "Roles across, permissions down, with inheritance, locked roles and one tab stop.",
  category: "data",
  status: "stable",
  dependencies: [],
  registryDependencies: ["checkbox"],
  files: ["permission-model.ts", "permission-matrix.tsx"],
  a11y:
    'A grid in the WAI-ARIA sense: role="grid" with one tab stop, arrow keys between cells, Home ' +
    "and End along a row and Ctrl with them across the whole matrix — the right call for a " +
    "matrix that is operated, where it was the wrong one for a diff that is read. Every checkbox " +
    'is named by both coordinates, "Delete projects for Editor", so a reader arriving by arrow ' +
    "key knows where they are without re-reading the headers. An inherited grant is a checked " +
    "box that cannot be changed here, marked aria-disabled rather than disabled so it stays in " +
    "the keyboard path, with the role it came from as its description. A locked role says in " +
    "each cell's description that nothing can be changed. Group toggles are tri-state, and the " +
    "column header counts each role's grants in text.",
});
