import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "pricing",
  kind: "block",
  title: "Pricing",
  description: "A pricing section with plan cards and a monthly/yearly toggle.",
  category: "layout",
  status: "stable",
  dependencies: [],
  registryDependencies: ["badge", "button", "card", "label", "switch"],
  files: ["pricing.tsx"],
  a11y:
    "Switching the billing period rewrites every price on the page, so the change is announced " +
    "politely rather than happening silently. Each plan's call to action names the plan — three " +
    'buttons all reading "Choose" are indistinguishable out of context. Feature ticks are ' +
    "decorative; the feature text carries the meaning.",
});
