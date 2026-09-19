import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "hero-perspective-grid",
  kind: "block",
  title: "Hero perspective grid",
  description:
    "A centred hero over a tilted 3D plane of tiles that light up under the pointer.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button", "text-effect"],
  files: ["hero-perspective-grid.tsx"],
  a11y:
    "One section landmark named by its headline, whose level is a prop. The tile plane is " +
    "aria-hidden decoration with no focusable parts. Calls to action are real links. Under " +
    "reduced motion the entrance and the tile fade settle instantly and the plane lies flat " +
    "instead of tilting in perspective.",
});
