import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "checkbox",
  title: "Checkbox",
  description: "A control for an on/off choice, with support for an indeterminate state.",
  category: "form",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["checkbox.tsx"],
  a11y:
    "Toggles with Space, matching the native control. Always pair with a Label via htmlFor/id — " +
    'the box alone has no accessible name. Indeterminate is announced as "mixed" and is a ' +
    "state the application sets, not one the user can reach by clicking.",
  guidance: {
    useWhen: [
      "an on/off choice that is saved when the form is submitted",
      "choosing several independent options from a list",
      "a parent box summarising a partly selected group",
    ],
    avoidWhen: [
      "a setting that applies immediately — use switch",
      "one choice out of several — use radio-group",
    ],
    alternatives: ["switch", "radio-group", "toggle"],
  },
  composesWith: ["label", "form"],
});
