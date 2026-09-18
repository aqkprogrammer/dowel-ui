import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "magnetic-button",
  title: "Magnetic Button",
  description:
    "A button that drifts toward the pointer — optionally with its label leaning further — and springs back when it leaves.",
  category: "form",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button"],
  files: ["magnetic-button.tsx"],
  a11y:
    "The drift is decoration on an ordinary Button: name, role and keyboard behaviour are " +
    "unchanged. It never runs for touch or coarse pointers, or under prefers-reduced-motion, " +
    "and a disabled or loading button stays put. The `radius` option listens on the window " +
    "rather than widening the hit area, so it never steals clicks from neighbouring controls.",
});
