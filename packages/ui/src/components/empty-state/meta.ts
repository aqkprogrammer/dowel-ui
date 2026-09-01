import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "empty-state",
  title: "Empty State",
  description: "Shown where content would be, explaining why it is empty and what to do next.",
  category: "feedback",
  status: "stable",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["empty-state.tsx"],
  a11y:
    "A plain container with no implicit landmark or live region. When it replaces content after " +
    "a search, put aria-live on the results region so the change is announced. The icon is " +
    "decorative — the title has to carry the message on its own.",
});
