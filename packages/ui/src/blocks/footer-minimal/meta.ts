import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "footer-minimal",
  kind: "block",
  title: "Footer Minimal",
  description: "A one-row footer: logo and copyright, a few links, and social links.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["footer-minimal.tsx"],
  a11y:
    "A footer landmark with its links in a named nav. The hover underline grows from the inline " +
    "start and is also drawn on keyboard focus. Social links are a named list and always carry " +
    "their name as text; external ones say they open a new tab. The separator between logo and " +
    "copyright is decorative. The entrance only hides a footer below the fold, never under reduced " +
    "motion.",
});
