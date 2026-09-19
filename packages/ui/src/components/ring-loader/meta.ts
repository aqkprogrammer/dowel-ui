import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ring-loader",
  title: "Ring Loader",
  description:
    "Indeterminate loading indicators made of rings and spinners — classic, sweep, radar, gears and 26 more motions.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["ring-loader.tsx"],
  a11y:
    "Renders aria-hidden by default so it does not announce inside controls that already " +
    'expose a busy state. Pass `label` to announce it standalone via role="status". ' +
    "Under reduced motion it slows rather than stopping, because a frozen loader reads as a hang.",
});
