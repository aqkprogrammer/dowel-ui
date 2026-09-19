import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-suggestions",
  title: "Suggestions",
  description:
    "Prompt suggestion chips for a chat's empty state or follow-ups, arriving from the centre of the row outwards.",
  category: "ai",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["ai-suggestions.tsx"],
  a11y:
    'A list of real buttons, named by the visible heading (aria-labelledby) or "Suggestions". Every chip is in ' +
    "the tab order with the shared focus ring. The entrance stagger is decoration and does not run under reduced " +
    "motion. Selecting hands the suggestion back; filling the composer rather than sending keeps it editable.",
});
