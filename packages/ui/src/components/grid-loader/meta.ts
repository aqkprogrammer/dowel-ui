import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "grid-loader",
  title: "Grid Loader",
  description:
    "Indeterminate loading indicators on a grid of cells — 48 patterns (and 17 SmoothUI alias names) that pulse or stagger, plus sequence, thinking and matrix.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["grid-loader.tsx"],
  a11y:
    "Renders aria-hidden by default so it does not announce inside controls that already " +
    'expose a busy state. Pass `label` to announce it standalone via role="status". ' +
    "Under reduced motion it slows rather than stopping, because a frozen loader reads as a hang.",
});
