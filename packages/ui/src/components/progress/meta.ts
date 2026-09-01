import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "progress",
  title: "Progress",
  description: "Shows how far along a task is, or that one is running at all.",
  category: "feedback",
  status: "stable",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["progress.tsx"],
  a11y:
    'Exposed as role="progressbar" with aria-valuenow, and give it a name with aria-label or ' +
    "aria-labelledby. Omitting `value` marks it indeterminate, which is announced differently " +
    "from zero. Show the percentage in text as well — the bar alone is not readable at a glance " +
    "for everyone.",
});
