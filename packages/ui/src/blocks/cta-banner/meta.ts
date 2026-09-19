import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "cta-banner",
  kind: "block",
  title: "CTA banner",
  description:
    "A compact banner call to action: headline, one line of copy and a single action.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button", "card"],
  files: ["cta-banner.tsx"],
  a11y:
    "One section landmark named by its headline, whose level is a prop (default 2). The action is " +
    "a real link whose arrow mirrors in right-to-left text. The banner settles in once, on first " +
    "scroll into view, and instantly under reduced motion.",
});
