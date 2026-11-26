import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "step-track",
  title: "Step Track",
  description:
    "A compact horizontal stepper whose line fills to the active node, which swells, with previous and next buttons below.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["step-track.tsx"],
  a11y:
    'A role="group" (named "Progress" unless aria-label is given) holding an ordered list whose active item has aria-current="step"; ' +
    'each node carries hidden text such as "Step 2 of 4: Shipping". The previous and next buttons are native buttons with ' +
    "accessible names, disabled at either end, with a visible focus ring. A polite, atomic live region announces the new step " +
    "once per change. The line fills along the reading direction and the chevrons mirror in right-to-left layouts. " +
    "Under reduced motion the line and nodes change without animating.",
  guidance: {
    useWhen: [
      "a short, linear flow of three to six steps where space is tight, such as onboarding",
    ],
    avoidWhen: [
      "steps that need visible titles and descriptions — use stepper",
      "free navigation between sections — use tabs",
    ],
    alternatives: ["stepper", "progress", "pagination"],
  },
});
