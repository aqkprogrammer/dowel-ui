import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "orb-face",
  title: "Orb Face",
  description:
    "A cartoon assistant orb whose gaze follows the pointer, who blinks, and whose expression tells its state — listening, thinking, speaking, done or broken.",
  category: "ai",
  status: "beta",
  dependencies: ["motion"],
  registryDependencies: [],
  files: ["orb-face.tsx"],
  a11y:
    'Decorative: aria-hidden unless given aria-label or aria-labelledby, when it becomes role="img" — keep that ' +
    "label in step with `state`, and keep a text status nearby, because an expression is not a word. It is never " +
    "a live region. Under reduced motion the gaze, blinking and thinking glances are switched off and every " +
    "keyframe stops, leaving each state's settled face; the gaze spring is the only use of `motion`.",
});
