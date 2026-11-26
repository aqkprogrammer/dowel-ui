import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "cart-badge",
  title: "Cart Badge",
  description:
    "A bag tile with a count badge and a plus button that flies a dot into the bag on an arc, popping the badge as it lands.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["cart-badge.tsx"],
  a11y:
    'The plus is a native button named by `addLabel` ("Add to bag"), operable with Enter and Space and ' +
    "with a visible focus ring. The bag drawing, badge digits and flying dot are aria-hidden; a polite live " +
    'region states the count in words ("3 items in bag") and updates only when a dot lands, so rapid ' +
    "presses do not chatter. Under reduced motion the flight and pop snap to their final frames and the " +
    "count updates at once.",
  guidance: {
    useWhen: [
      "an add-to-cart control that should show the item travelling into a bag with a count",
    ],
    avoidWhen: [
      "choosing a quantity of one item — use quantity-input",
      "a plain notification count on an icon — use badge",
    ],
    alternatives: ["quantity-input", "badge"],
  },
});
