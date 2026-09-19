import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "cta-centered",
  kind: "block",
  title: "CTA centered",
  description: "A centred call to action with two actions on a muted band with a soft glow.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button"],
  files: ["cta-centered.tsx"],
  a11y:
    "One section landmark named by its headline, whose level is a prop (default 2). Both actions " +
    "are real links. The glow is aria-hidden decoration. The copy rises in once, on first scroll " +
    "into view, and settles instantly under reduced motion.",
});
