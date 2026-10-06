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
  guidance: {
    useWhen: [
      "an object streamed field by field from the model into a layout that must not jump",
      "extraction, enrichment or parsing results shown as they arrive",
    ],
    avoidWhen: ["reviewing each field against its source document — use ai-extraction-review"],
    alternatives: ["ai-extraction-review", "ai-suggested-value"],
  },
});
