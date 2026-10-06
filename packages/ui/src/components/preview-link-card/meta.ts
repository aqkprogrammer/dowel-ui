import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "preview-link-card",
  title: "Preview Link Card",
  description:
    "An inline link that previews its destination on hover or focus: the image wipes in from a shimmer while settling from a slight zoom, and the text lines rise in after it.",
  category: "overlay",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["hover-card"],
  files: ["preview-link-card.tsx"],
  a11y:
    "The trigger is a plain <a href>: it navigates, sits in the tab order, and keyboard focus opens " +
    "the card exactly as hovering does (Radix HoverCard); Escape closes it. The card is a visual " +
    "preview only — it is not announced and is not focusable — so the link text must say where it " +
    "goes. The image has empty alt text by default because it previews a destination the link " +
    "already names; pass imageAlt when it carries information of its own. The shimmer is aria-hidden. " +
    "No network requests are made beyond loading the image you supply. The reveal, shimmer and " +
    "stagger stop under reduced motion.",
  guidance: {
    useWhen: [
      "an inline link that previews its destination — image, heading, host — on hover or focus",
    ],
    avoidWhen: [
      "previews of people or records — use hover-card",
      "a card with an action to press — use rich-popover",
    ],
    alternatives: ["hover-card", "rich-popover", "tooltip"],
  },
});
