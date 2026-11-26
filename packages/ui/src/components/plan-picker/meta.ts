import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "plan-picker",
  title: "Plan Picker",
  description:
    "Plan cards in a radio group whose selection outline and corner dot travel along the cards' edges to the new choice.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["plan-picker.tsx"],
  a11y:
    'Built on the Radix radio group: a radiogroup (named "Plan" by default; override with aria-label) of radio ' +
    "buttons, one tab stop, arrow keys move and choose, and a hidden input carries the value inside forms. Each " +
    "card's accessible name is its plan and price text. The travelling outline and dot are aria-hidden; the " +
    "checked state is what is announced, and the checked card's name also brightens so the choice is not shown " +
    "by the outline alone. Layout and travel mirror in right-to-left layouts, and under reduced motion the " +
    "outline jumps.",
  guidance: {
    useWhen: [
      "choosing one of two to four pricing plans or tiers",
      "a compact card choice where the name and one line of detail are enough",
    ],
    avoidWhen: [
      "plans that need feature lists to compare — use full pricing cards with radio-group",
      "more than four options — use radio-group or select",
    ],
    alternatives: ["radio-group", "toggle-group", "select"],
  },
});
