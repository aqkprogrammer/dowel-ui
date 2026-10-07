import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "flip-card",
  title: "Flip Card",
  description:
    "A two-faced card that turns over in 3D: it leans toward the pointer, lifts as it turns, and a sheen sweeps across the faces.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["flip-card.tsx"],
  a11y:
    'Turning over is a toggle button in the card\'s corner, named "Show back" and exposed with aria-pressed; the ' +
    "name stays the same in both states, as a toggle's should. The button sits outside the rotating faces, so it is " +
    "always reachable and never turns away. The face turned away is inert and aria-hidden, so its links and buttons " +
    'cannot be reached by Tab or a screen reader. trigger="hover" also turns the card while a mouse rests on it, ' +
    "but the button stays for keyboard and touch. The shadow and sheen are aria-hidden decoration. Springs run " +
    'through motion inside MotionConfig reducedMotion="user"; under reduced motion the card neither leans nor lifts ' +
    "and turning over is an instant swap. Nothing moves on first paint.",
});
