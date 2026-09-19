import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "hero-spotlight",
  kind: "block",
  title: "Hero spotlight",
  description: "A dark hero lit by a spotlight beam that opens as it scrolls into view.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button"],
  files: ["hero-spotlight.tsx"],
  a11y:
    "One section landmark named by its headline, whose level is a prop. It is dark in every theme " +
    "through the theme's own dark tokens, so contrast holds. The beam and dust are aria-hidden " +
    "decoration; the dust twinkles three times and rests rather than looping forever. The " +
    "entrance plays once, on first scroll into view, and settles instantly under reduced motion.",
});
