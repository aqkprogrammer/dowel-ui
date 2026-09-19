import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "features-bento",
  kind: "block",
  title: "Features bento",
  description:
    "A bento grid of features: a two-by-two lead cell carrying a visual — by default a small analytics panel whose bars grow in — among smaller cells.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["badge", "card"],
  files: ["features-bento.tsx"],
  a11y:
    "One section landmark named by its heading (level set with `headingLevel`, cell titles one " +
    "below). The cells are a list. The analytics panel states its figure and change in text; its " +
    "bars are decorative and aria-hidden. Only a grid starting below the fold is hidden before it " +
    "scrolls in, and never under reduced motion.",
});
