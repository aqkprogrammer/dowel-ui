import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "align-toggle",
  title: "Align Toggle",
  description:
    "A segmented start, center and end alignment control whose thumb stretches between choices above a live paragraph preview.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["align-toggle.tsx"],
  a11y:
    'Built on Radix ToggleGroup in single mode: the root is a radiogroup named "Text alignment" by default ' +
    "(override with aria-label), arrow keys move focus between the three radio buttons, Space or Enter chooses, and " +
    'the chosen one is checked. Each choice is named ("Align start", "Align center", ' +
    '"Align end"; override with `labels`) since it shows only an icon, and pressing the chosen one again does ' +
    "not clear it. The paragraph preview and the thumb are aria-hidden. Values are logical, so in right-to-left " +
    "layouts start aligns right and the icons mirror. Under reduced motion the thumb and preview jump.",
  guidance: {
    useWhen: [
      "a text-alignment control in an editor toolbar or a design panel",
      "a compact three-way choice where an icon preview helps",
    ],
    avoidWhen: [
      "more than three options, or options with text labels — use toggle-group or tabs",
      "choices that can be combined, such as bold and italic — use toggle",
    ],
    alternatives: ["toggle-group", "radio-group", "toggle"],
  },
});
