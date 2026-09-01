import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-model-selector",
  title: "AI Model Selector",
  description: "Picks the model a conversation runs on, with descriptions and availability.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: ["select"],
  files: ["ai-model-selector.tsx"],
  a11y:
    "Inherits Select's listbox keyboard model. Each option sets textValue to the model name so " +
    "typeahead matches the name rather than the description. A disabled model shows and " +
    "announces why it is unavailable — a disabled option with no reason reads as a broken " +
    "interface.",
});
