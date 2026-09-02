import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "metric-delta",
  title: "Metric Delta",
  description: "A headline number with a change indicator that knows which direction is good.",
  category: "data",
  status: "stable",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["metric-delta.tsx"],
  a11y:
    "The meaning is never carried by colour and an arrow alone, which fails WCAG 1.4.1 — the " +
    "direction and the comparison are always stated in text. The tile reads as one sentence " +
    "rather than three fragments: the visible number and delta are aria-hidden and a single " +
    "screen-reader description carries value, direction, comparison and, where given, sample " +
    "size. A zero baseline is announced as having no percentage rather than as an infinite one.",
});
