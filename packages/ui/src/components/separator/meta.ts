import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "separator",
  title: "Separator",
  description: "A horizontal or vertical rule that divides content.",
  category: "layout",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["separator.tsx"],
  a11y:
    "Decorative by default and hidden from assistive technology. Set decorative={false} to " +
    "expose it as a semantic separator when it divides meaningfully distinct groups.",
});
