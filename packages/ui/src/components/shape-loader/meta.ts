import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "shape-loader",
  title: "Shape Loader",
  description:
    "Indeterminate loading indicators made of geometric shapes — flipping squares, hexagons, hourglasses, hearts and 31 more motions.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["shape-loader.tsx", "shape-loader-variants.tsx"],
  a11y:
    "Renders aria-hidden by default so it does not announce inside controls that already " +
    'expose a busy state. Pass `label` to announce it standalone via role="status". ' +
    "Under reduced motion it slows rather than stopping, because a frozen loader reads as a hang.",
});
