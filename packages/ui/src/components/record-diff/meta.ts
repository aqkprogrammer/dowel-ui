import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "record-diff",
  title: "Record Diff",
  description:
    "Field-level before and after, for audit entries, settings history and revisions.",
  category: "data",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["record-diff.tsx"],
  a11y:
    'A real table, not a grid of divs. Each field name is a th with scope="row", so a value is ' +
    "announced with the field it belongs to rather than as a loose cell. The kind of change is " +
    "never carried by row colour alone — every row states added, removed or changed in text for " +
    "screen readers, satisfying WCAG 1.4.1. The unchanged-field toggle is a real button with " +
    "aria-expanded. Redacted values never reach the DOM at all.",
});
