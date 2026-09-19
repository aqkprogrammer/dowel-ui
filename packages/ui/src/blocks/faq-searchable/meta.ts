import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "faq-searchable",
  kind: "block",
  title: "FAQ Searchable",
  description: "Frequently asked questions filtered by a search field as you type.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["accordion", "input", "label"],
  files: ["faq-searchable.tsx"],
  a11y:
    "The search field has a real (visually hidden) label, not only a placeholder that disappears " +
    "once someone types. Filtering replaces the list, so the number of matches — or the no-results " +
    "message — is a polite live region. Questions are accordion buttons inside headings; a new " +
    "search closes the open answer, since it may no longer be in the list.",
});
