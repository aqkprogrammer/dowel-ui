import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "border-beam",
  title: "Border Beam",
  description:
    "A short light that travels round the border of any button, card or field it sits in — always, or only on hover and focus.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["border-beam.tsx"],
  a11y:
    "Pure decoration: the beam is aria-hidden and takes no pointer events, so the element it decorates keeps " +
    "its role, name, focus ring and hit area. It never carries meaning — do not use it as the only sign that " +
    "something is selected, active or loading. Under reduced motion it rests at the start of its path instead " +
    "of travelling; in forced-colours mode it is removed and the element's own border carries the shape. With " +
    'trigger="hover" it also appears for keyboard focus, so pointer and keyboard users see the same thing.',
  guidance: {
    useWhen: [
      "drawing the eye to one primary call to action or featured card",
      "an AI or generate button that should feel alive while idle",
    ],
    avoidWhen: [
      "several beams on one screen — they compete; pick one",
      "showing progress or state — use progress, spinner or a badge",
    ],
    alternatives: ["glow-card", "effect-button", "shimmer-text"],
  },
  controls: {
    duration: { min: 1000, max: 15000, step: 500 },
    delay: { min: -6000, max: 6000, step: 250 },
    length: { min: 0.05, max: 1, step: 0.05 },
    thickness: { min: 1, max: 4, step: 0.5 },
    colorTo: { kind: "color" },
  },
  composesWith: ["button", "card", "glow-card"],
});
