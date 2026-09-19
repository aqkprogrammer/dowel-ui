import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "footer-simple",
  kind: "block",
  title: "Footer Simple",
  description: "A site footer with the brand and social links beside three columns of links.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["footer-simple.tsx"],
  a11y:
    "A footer landmark whose link columns sit in a named nav, each column titled by a heading whose " +
    "level is configurable. Social links are a named list and always carry their name as text — " +
    "visually hidden when an icon is shown — and external ones say they open a new tab. The " +
    "entrance only hides a footer that starts below the fold, and never under reduced motion.",
});
