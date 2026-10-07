import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "hole-background",
  title: "Hole Background",
  description:
    "A perspective tunnel into a black hole: rings recede and flow inward, radial lines run down the walls and particles swirl in faster and faster; the vanishing point follows the pointer.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["hole-background.tsx", "hole-background-sim.ts"],
  a11y:
    "The tunnel is decoration: the canvas and the vignette are aria-hidden and ignore the pointer, and " +
    "children render above them in their own layer with their roles, focus order and hit areas intact. The " +
    "vanishing point following the pointer is an optional flourish tracked on the root without capturing " +
    "events, so nothing depends on it. The vignette fades toward the page background, which helps text " +
    "laid over the edges. The loop pauses off-screen and in hidden tabs; under reduced motion (or a " +
    "--motion-scale near zero) it draws one still frame of the tunnel, centred, with particles caught " +
    "mid-fall, and ignores the pointer.",
});
