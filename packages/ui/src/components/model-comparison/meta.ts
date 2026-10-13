import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "model-comparison",
  title: "Model Comparison",
  description:
    "Models side by side — price, speed, context, scores — in a table that marks the best of each row and lets people choose one.",
  category: "ai",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["model-comparison.tsx"],
  a11y:
    "A real table with a caption, model column headers and metric row headers, so every cell is announced " +
    'with its model and metric. The best value in a row is marked with the word "Best", not colour alone, ' +
    'and yes/no values are words as well as icons. Missing values are spoken as "Not available". The ' +
    "metric column stays in place while models scroll inside a named, focusable region. Choosing is a " +
    "toggle button per model (aria-pressed).",
  guidance: {
    useWhen: [
      "helping someone pick a model by price, speed and quality",
      "comparing plans or providers on the same measures",
    ],
    avoidWhen: [
      "picking a model inline while chatting — use ai-model-selector",
      "a long list of models to sort and filter — use data-table",
    ],
    alternatives: ["ai-model-selector", "data-table", "table"],
  },
  composesWith: ["ai-model-selector", "ai-token-usage"],
});
