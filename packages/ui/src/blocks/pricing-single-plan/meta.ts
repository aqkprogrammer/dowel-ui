import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "pricing-single-plan",
  kind: "block",
  title: "Pricing Single Plan",
  description:
    "One plan with every feature, under a monthly/annual switch with a price that rolls.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["badge", "button", "card", "label", "number-flow", "radio-group"],
  files: ["pricing-single-plan.tsx"],
  a11y:
    "The billing period is a named radio group (arrow keys move between Monthly and Annually); " +
    "switching it rewrites the price, so the change is announced politely, and the price is read " +
    'once as its settled value. The call to action names the plan ("Get started, Pro plan") and ' +
    "is a real link. The accent stripe and feature ticks are decorative. The entrance and the " +
    "rolling digits settle instantly under reduced motion.",
});
