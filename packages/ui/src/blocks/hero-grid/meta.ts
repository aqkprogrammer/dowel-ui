import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "hero-grid",
  kind: "block",
  title: "Hero grid",
  description: "A centred hero over a grid of squares that light up under the pointer.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button", "text-effect"],
  files: ["hero-grid.tsx"],
  a11y:
    "One section landmark named by its headline, whose level is a prop so the block fits any " +
    "page outline. The hover grid is aria-hidden decoration made of plain elements, not buttons, " +
    "so it adds no tab stops. Calls to action are real links. The entrance and the hover fade run " +
    "on the motion scale and settle at rest under reduced motion.",
});
