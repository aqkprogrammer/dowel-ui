import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "stacking-cards",
  title: "Stacking Cards",
  description:
    "Cards that stack at the top of the screen as the page scrolls, each sliding up over the last while covered ones ease back.",
  category: "effects",
  status: "beta",
  dependencies: [],
  registryDependencies: ["use-in-view", "use-reduced-motion"],
  files: ["stacking-cards.tsx"],
  a11y:
    "The stacking is position: sticky, so it works with JavaScript off and the page scrolls exactly as it " +
    "would without it. Every card stays in the document in order, so reading and tabbing go through them as " +
    "written, and each card has a scroll margin equal to where it sticks, so focusing content in a card brings " +
    "it clear of the cards stacked above. The easing back is decoration: one transform per card, skipped under " +
    "reduced motion.",
  guidance: {
    useWhen: [
      "a sequence of steps, features or case studies the reader scrolls through",
      "a pricing or product story told one card at a time",
    ],
    avoidWhen: [
      "content the reader compares side by side — use a grid",
      "short pages, where there is nothing to scroll through",
    ],
    alternatives: ["card-stack", "horizontal-scroll", "scroll-reveal"],
  },
  composesWith: ["card", "scroll-reveal"],
  controls: {
    offset: { min: 0, max: 240, step: 8 },
    gap: { min: 0, max: 64, step: 2 },
    shrink: { min: 0, max: 0.2, step: 0.01 },
  },
});
