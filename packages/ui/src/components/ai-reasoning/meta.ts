import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-reasoning",
  title: "AI Reasoning",
  description: "A collapsible disclosure for the model's reasoning.",
  category: "ai",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: ["shimmer-text"],
  files: ["ai-reasoning.tsx"],
  a11y:
    "A standard disclosure with aria-expanded on the trigger. Collapsed by default because " +
    "reasoning is supporting material — giving it the same weight as the answer buries the " +
    "answer. The trigger's label changes while reasoning streams, so its accessible name matches " +
    'what is happening — and to "Thought for 4.2s" when given a duration. autoOpen and ' +
    "autoCollapse are opt-in; auto-collapse never closes the trace while focus or the pointer is " +
    "inside it. The optional shimmer is decoration and stops under reduced motion.",
});
