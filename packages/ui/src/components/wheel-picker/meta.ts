import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "wheel-picker",
  title: "Wheel Picker",
  description:
    "A drum of options you spin to pick one: rows turn on a cylinder and snap into a selection band, like a phone's time picker.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["wheel-picker.tsx"],
  a11y:
    'A role="listbox" that keeps focus on itself and points aria-activedescendant at the centred option, ' +
    "which is also aria-selected. Arrow keys move one row, Page Up/Down a screenful, Home/End to the ends, and " +
    "typing jumps to the next option starting with those letters; disabled options are skipped. Name it with " +
    "aria-label or aria-labelledby. Selection commits when the drum settles, so a fling does not announce " +
    "every row it passes. The turning rows are decoration; under reduced motion scrolling jumps instead of gliding.",
  guidance: {
    useWhen: [
      "picking one value from a short ordered list on touch screens — an hour, a quantity, a month",
    ],
    avoidWhen: [
      "a long or searchable list — use combobox",
      "choosing among a few options shown at once — use radio-group or select",
    ],
    alternatives: ["select", "combobox", "dial", "duration-picker"],
  },
  composesWith: ["form", "label"],
});
