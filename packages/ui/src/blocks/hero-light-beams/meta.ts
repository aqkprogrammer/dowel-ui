import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "hero-light-beams",
  kind: "block",
  title: "Hero light beams",
  description:
    "A centred hero under a fan of light — an announcement pill, the headline, copy and two actions. CSS only.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button", "light-beams"],
  files: ["hero-light-beams.tsx"],
  a11y:
    "One section landmark named by its headline, whose level is a prop (h1 by default — it is meant to " +
    "open a page). The beams are aria-hidden decoration that hold still under reduced motion, and the copy " +
    "sits on the theme's own background so its contrast does not depend on the light. The announcement is " +
    "a real link whose dot and arrow are hidden from screen readers.",
  guidance: {
    useWhen: ["a landing page opening with a soft, theatrical light behind the headline"],
    avoidWhen: ["a busy page where motion would compete — use hero-minimal"],
    alternatives: ["hero-spotlight", "hero-flow-field", "hero-minimal"],
  },
});
