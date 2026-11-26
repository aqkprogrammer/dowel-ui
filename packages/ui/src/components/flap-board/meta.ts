import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "flap-board",
  title: "Flap Board",
  description:
    "A split-flap display, like an old departures board: each character flips over through the set to its new value, rippling along the row.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["use-reduced-motion"],
  files: ["flap-board.tsx"],
  a11y:
    "Read once, as text: a visually hidden polite live region holds the value, so a change is announced " +
    "when it is made rather than character by character, and the flipping cells are aria-hidden. Under " +
    "reduced motion the characters change at once. The board always runs left to right, as the real thing " +
    "does, even in a right-to-left page.",
  guidance: {
    useWhen: [
      "a short status, code or headline that changes now and then: a gate, a countdown label, a live score",
      "a hero or event page that wants the mechanical charm of a departures board",
    ],
    avoidWhen: [
      "text that changes many times a second — use number-flow",
      "long sentences: each cell is a fixed-width tile",
    ],
    alternatives: ["number-flow", "scramble-text", "text-swap"],
  },
  controls: {
    speed: { min: 30, max: 300, step: 10 },
    maxFlips: { min: 1, max: 40, step: 1 },
    stagger: { min: 0, max: 200, step: 10 },
  },
});
