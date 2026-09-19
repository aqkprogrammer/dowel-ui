import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "gradient-orb",
  title: "Gradient Orb",
  description:
    "An animated gradient orb — a rotating conic mesh with a dot screen, sheen and bloom — that can follow an AI state and a live audio level.",
  category: "effects",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["gradient-orb.tsx"],
  a11y:
    'Decorative: aria-hidden unless given aria-label or aria-labelledby, when it becomes role="img". It never ' +
    "reports state on its own — pair it with a text status. Pure CSS; under reduced motion every loop stops and " +
    "the orb shows its settled first frame.",
});
