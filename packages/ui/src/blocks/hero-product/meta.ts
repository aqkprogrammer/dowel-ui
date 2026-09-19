import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "hero-product",
  kind: "block",
  title: "Hero product",
  description:
    "A centred hero with an announcement, headline and two calls to action over a large product screenshot.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["badge", "button", "text-effect"],
  files: ["hero-product.tsx"],
  a11y:
    "One section landmark named by its headline, whose level is a prop. The announcement and " +
    "calls to action are real links. The screenshot is content and requires alt text; the " +
    "placeholder shown without one is aria-hidden. The staged entrance runs on the motion scale " +
    "and the hover lift and tilt are motion-safe only, so under reduced motion nothing moves.",
});
