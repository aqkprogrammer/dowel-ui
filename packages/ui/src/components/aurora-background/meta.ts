import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "aurora-background",
  title: "Aurora Background",
  description:
    "Slow, blurred light behind content: streaked curtains hung from the top, or soft colour fields that wander — CSS only, paused off-screen.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["aurora-background.tsx"],
  a11y:
    "Pure decoration: the light is aria-hidden and takes no pointer events, and children render above it in " +
    "their own layer, keeping their roles, focus order and hit areas. It animates only by transform and pauses " +
    "while off-screen. Under reduced motion it stands still on its last frame; in forced-colours mode it is " +
    "removed. Colours are theme tokens, but blurred light still lowers the contrast of text laid over it — " +
    "lower `intensity`, or set text on a surface, where the light is bright.",
  guidance: {
    useWhen: [
      "a landing hero or sign-up page that needs colour and atmosphere",
      "a light-theme section where a dark star field would be too heavy",
    ],
    avoidWhen: [
      "behind long reading text — use a flat surface",
      "a single static gradient — use gradient-background or a CSS background",
    ],
    alternatives: ["gradient-background", "bubble-background", "cosmic-background"],
  },
  composesWith: ["text-effect", "shimmer-text", "border-beam"],
});
