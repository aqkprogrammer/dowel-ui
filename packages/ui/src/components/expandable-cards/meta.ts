import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "expandable-cards",
  title: "Expandable Cards",
  description:
    "Cards that open into a detail view — widening in place in a row, or growing out of a grid into a modal.",
  category: "display",
  status: "beta",
  dependencies: ["motion", "radix-ui"],
  registryDependencies: [],
  files: ["expandable-cards.tsx"],
  a11y:
    "Every card is a real button. Inline, it is a disclosure (aria-expanded, aria-controls) whose detail is a " +
    "labelled region: opening moves focus into it, Escape closes it from anywhere inside the card and returns " +
    "focus to the card, and a closed detail is aria-hidden and inert. As a dialog it is a Radix modal — focus " +
    "trap, aria-modal, title and description, Escape and a named Close button — and focus returns to the card " +
    'that opened it. Motion follows MotionConfig reducedMotion="user": under reduced motion the card still ' +
    "opens, without growing out of its place.",
});
