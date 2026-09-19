import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "tilt-card",
  title: "Tilt Card",
  description:
    "A card that tilts in 3D toward the pointer, with a glare that follows it and layers that float at their own depth, springing back flat on leave.",
  category: "display",
  status: "beta",
  dependencies: [],
  registryDependencies: ["card"],
  files: ["tilt-card.tsx"],
  a11y:
    "The tilt is decoration on an ordinary Card: it adds no role, name or tab stop, so a card that acts as a link " +
    "should contain a real link (the stories stretch one over the card). The glare layer is aria-hidden and ignores the pointer. " +
    "The card stays flat for touch and coarse pointers and under prefers-reduced-motion. Keyboard focus on the card or " +
    "anything inside it shows a small static lift instead of a tilt, and a focusable card gets the standard focus ring.",
});
