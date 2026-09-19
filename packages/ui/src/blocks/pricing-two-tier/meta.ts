import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "pricing-two-tier",
  kind: "block",
  title: "Pricing Two Tier",
  description:
    "A free plan beside a featured paid one, under a monthly/annual switch with prices that roll.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["badge", "button", "card", "label", "number-flow", "radio-group"],
  files: ["pricing-two-tier.tsx"],
  a11y:
    "The billing period is a named radio group (arrow keys move between Monthly and Annually); " +
    "switching it rewrites every price, so the change is announced politely. Each price is read " +
    "once, as its settled value. Each call to action names its plan (" +
    '"Get started, Pro plan"), links are real links, the recommended plan is marked in text, and ' +
    "feature ticks are decorative. The cards' entrance and the rolling digits settle instantly " +
    "under reduced motion.",
});
