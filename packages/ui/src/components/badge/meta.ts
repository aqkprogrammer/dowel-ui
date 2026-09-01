import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "badge",
  title: "Badge",
  description: "A compact marker for status, counts and categories.",
  category: "display",
  status: "stable",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["badge.tsx"],
  a11y:
    "The badge label must convey the meaning on its own; variant colour is decoration. " +
    "Use asChild to render an interactive badge as a link or button rather than adding handlers.",
});
