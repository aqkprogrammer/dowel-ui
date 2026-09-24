import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "fluid-orb",
  title: "Fluid Orb",
  description:
    "An ambient WebGL orb of drifting fluid colour — patches that wander, merge and re-form in bands derived from one colour — with a CSS gradient fallback.",
  category: "ai",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["fluid-orb.tsx"],
  a11y:
    'Decorative: aria-hidden unless given aria-label or aria-labelledby, when it becomes role="img". It reports ' +
    "no state, so pair it with a text status wherever it stands for an assistant. Under reduced motion (or " +
    "--motion-scale at zero) it holds a still frame. Rendering pauses off screen and in hidden tabs. Without " +
    "WebGL, or after a lost context, a static CSS gradient orb stands in.",
});
