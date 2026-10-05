import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "toggle",
  title: "Toggle",
  description:
    "A two-state button that squishes when pressed, springs back on release, and pours its fill out from the centre when it turns on.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["toggle.tsx"],
  a11y:
    "A native button exposed with aria-pressed, operable with Space and Enter. An icon-only toggle " +
    'needs an aria-label, and the label should name the thing being switched ("Bold"), not the ' +
    "state, since aria-pressed already reports on or off. The fill layer is aria-hidden and the " +
    "state is never carried by colour alone — the pressed state is announced. Nothing animates on " +
    "first paint, and under reduced motion the squish, fill and icon pop all resolve instantly.",
});
