import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "liquid-button",
  title: "Liquid Button",
  description:
    "An outlined button that fills with rolling liquid on hover, focus and press — the label inverts as the surface passes it, and a press sloshes it.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["liquid-button.tsx"],
  a11y:
    "A native button named by its children, read once: the liquid layer and the inverted duplicate label are " +
    "aria-hidden. The fill responds to keyboard focus-visible and to being held down as well as to hover, so " +
    "keyboard and touch users get the same feedback. Both label colours are paired tokens (tone on background, " +
    "tone-foreground on tone), and the outline keeps the button visible at rest. Under reduced motion the waves " +
    "stop, the fill swaps instantly and the press does not slosh.",
  guidance: {
    useWhen: ["a standout outlined call to action on a landing page"],
    avoidWhen: ["actions in forms, tables and dense UI — use button"],
    alternatives: ["button", "effect-button"],
  },
});
