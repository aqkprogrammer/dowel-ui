import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "card",
  title: "Card",
  description: "A surface that groups related content and actions into a single block.",
  category: "display",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["card.tsx"],
  a11y:
    "Card renders a plain div with no implicit landmark. CardTitle is an h3 by default — use " +
    "asChild to set the level the page actually needs, since heading levels must increase by one, " +
    "or to render something that is not a heading at all.",
});
