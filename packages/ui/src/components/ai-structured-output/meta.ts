import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-structured-output",
  title: "AI Structured Output",
  description: "An object arriving field by field from the model, without the layout jumping.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["ai-structured-output.tsx"],
  a11y:
    "A description list, so each value is associated with its label rather than floating beside " +
    'it. The region is aria-live="polite" with aria-busy while streaming, so fields are ' +
    "announced as they settle instead of re-reading the whole object on every token. Height is " +
    "reserved from the declared field list, which keeps focus and reading position stable as " +
    "values arrive. Confidence is stated as a number in words, never as a colour alone.",
});
