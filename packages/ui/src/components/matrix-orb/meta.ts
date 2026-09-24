import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "matrix-orb",
  title: "Matrix Orb",
  description:
    "A circular dot-matrix orb that breathes while idle, blooms with a live level while listening and runs an orbiting scan while thinking, blending smoothly between them.",
  category: "ai",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["matrix-orb.tsx"],
  a11y:
    'The root is role="img", named by the current state — its caption from `labels`, or "Idle", "Listening", ' +
    '"Thinking" — so the name stays in step with what is drawn; aria-label or aria-labelledby replace it. The ' +
    "canvas and the visible caption are aria-hidden so nothing is read twice. State changes are silent unless " +
    "`announce` is set, which adds a polite status region that stays empty on first paint. Under reduced motion " +
    "(or --motion-scale at zero) the canvas draws one still frame per state; the state never depends on motion " +
    "or colour alone, because the name carries it.",
});
