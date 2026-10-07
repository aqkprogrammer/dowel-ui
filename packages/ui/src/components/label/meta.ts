import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "label",
  title: "Label",
  description: "An accessible caption that associates text with a form control.",
  category: "form",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["label.tsx"],
  a11y:
    "Set htmlFor to the id of the control it labels. Clicking the label moves focus to that " +
    "control, including composite widgets that are not native inputs.",
  guidance: {
    useWhen: ["captioning a form control, including composite widgets such as select"],
    avoidWhen: [
      "a field with a description and an error message — use form, which wires the label too",
    ],
    alternatives: ["form"],
  },
  composesWith: ["input", "textarea", "checkbox", "switch"],
});
