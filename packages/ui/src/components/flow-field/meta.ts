import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "flow-field",
  title: "Flow Field",
  description:
    "Particles carried along a slowly changing current, drawn as streaks behind content — wind on a weather map, data in motion — parting around the pointer.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["flow-field.tsx", "flow-field-sim.ts"],
  a11y:
    "Pure decoration: the canvas is aria-hidden and ignores the pointer, which is tracked on the root without " +
    "capturing events, so content inside keeps its roles and focus order. It pauses off-screen and in hidden " +
    "tabs. Under reduced motion it draws one still frame — the streaks laid along the current, not moving — so " +
    "the texture stays and the motion goes. Keep text on a surface where the streaks are dense.",
  guidance: {
    useWhen: [
      "a data, analytics or infrastructure hero that should feel alive",
      "a quiet moving texture behind a sign-up or waitlist section",
    ],
    avoidWhen: ["behind long reading text", "a static texture — use pattern-background"],
    alternatives: ["gravity-stars-background", "stars-background", "shader-background"],
  },
  composesWith: ["text-effect", "number-flow"],
  controls: {
    density: { min: 0, max: 3, step: 0.1 },
    speed: { min: 0, max: 4, step: 0.25 },
    length: { min: 2, max: 40, step: 1 },
    thickness: { min: 0.5, max: 3, step: 0.25 },
    scale: { min: 0.3, max: 3, step: 0.1 },
    opacity: { min: 0, max: 1, step: 0.05 },
    seed: { min: 1, max: 99, step: 1 },
  },
});
