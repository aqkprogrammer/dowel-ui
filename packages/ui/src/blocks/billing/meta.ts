import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "billing",
  kind: "block",
  title: "Billing",
  description:
    "A billing page: the current plan, metered usage against its limits, the payment method and the invoice history.",
  category: "data",
  status: "stable",
  dependencies: [],
  registryDependencies: ["badge", "button", "card", "empty-state", "progress", "table"],
  files: ["billing.tsx"],
  a11y:
    'Every usage meter states where it stands in words — "8 of 10 seats used, 2 left", or how ' +
    "far over the limit it is — because a bar that turns red says nothing to a screen reader and " +
    "nothing to anyone who cannot tell the colours apart; the bar itself is hidden from the " +
    "accessibility tree so the same fact is not announced twice. Each invoice download is named " +
    'after its invoice rather than being one of ten identical "Download" links, which is all a ' +
    "links list would show. A card's last four digits are spoken as digits instead of as a " +
    "four-figure number. Dates carry a machine-readable time element.",
});
