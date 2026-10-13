import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "use-reduced-motion",
  kind: "hook",
  title: "useReducedMotion",
  description:
    "Whether motion should be reduced — the OS setting or a theme's --motion-scale near zero — kept current as either changes.",
  category: "foundation",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["use-reduced-motion.ts"],
  a11y:
    "Use it for motion CSS cannot stop on its own: JavaScript loops, springs, autoplay and scroll animation. " +
    "It reports false on the server and during hydration, so anything that must not move on a reduced-motion " +
    "device should start still and begin moving only once the hook has said it may.",
});
