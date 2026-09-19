import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "focus-blur-links",
  title: "Focus Blur Links",
  description:
    "A row of links where hovering or focusing one blurs and dims the rest, with an optional dashed bracket.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["focus-blur-links.tsx"],
  a11y:
    "Every item is a real link (or your router's link via asChild). Keyboard focus triggers the same emphasis as " +
    "hover and holds it after the pointer leaves; focus from a click does not. The blur is visual only — dimmed " +
    "links stay in the accessibility tree and remain focusable. Wrap the row in a <nav aria-label> when it is " +
    "site navigation.",
});
