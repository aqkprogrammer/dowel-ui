import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "fireworks-background",
  title: "Fireworks Background",
  description:
    "Rockets rise on a timer and burst into peonies, rings and willows of sparks that drag, fall, fade and crackle, cycling through the theme's colours; a click launches one at the pointer.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["fireworks-background.tsx", "fireworks-background-sim.ts"],
  a11y:
    "The show is decoration: the canvas is aria-hidden and ignores the pointer, and children render above it " +
    "in their own layer with their roles, focus order and hit areas intact. A press launching a rocket is an " +
    "optional flourish tracked on the root without capturing or cancelling the event, so a button inside " +
    "still works and nothing depends on it. Bursts are soft and short; automatic launches are capped at three a " +
    "second, whatever the `rate`. The loop pauses off-screen and in hidden tabs; under reduced motion " +
    "(or a --motion-scale near zero) it draws one still frame of three frozen bursts, and presses do nothing. " +
    "Colour carries no meaning: every burst is equally decorative.",
});
