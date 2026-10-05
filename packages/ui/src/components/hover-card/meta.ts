import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "hover-card",
  title: "Hover Card",
  description:
    "A preview card that grows out of its trigger on a springy overshoot while coming into focus from a blur, with an optional stagger for its contents.",
  category: "overlay",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["hover-card.tsx"],
  a11y:
    "Radix HoverCard: opens when the trigger is hovered or receives keyboard focus, and closes on " +
    "blur, pointer leave or Escape. The card is a visual preview for sighted users — it is not " +
    "announced and is not in the tab order — so it must never hold the only copy of information or " +
    "an action; the trigger (usually a link) has to make sense on its own. The open and close delays " +
    "stop a card flashing up as the pointer passes. The grow, blur and stagger collapse under reduced " +
    "motion, so the card simply appears.",
});
