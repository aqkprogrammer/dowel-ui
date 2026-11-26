import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "glass-tilt-card",
  title: "Glass Tilt Card",
  description:
    "A frosted glass card that tilts in 3D toward the pointer with a glare that follows it, and sways gently at rest.",
  category: "display",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["glass-tilt-card.tsx"],
  a11y:
    "Decoration on a plain container: it adds no role, name or tab stop, so a card that acts as a link should " +
    "contain a real link or button. The sheen, glint and glare layers are aria-hidden and ignore the pointer, so " +
    "they never intercept clicks. The tilt never runs for touch, coarse pointers or under " +
    "prefers-reduced-motion, and the idle sway settles flat under reduced motion. Text on the glass should keep " +
    "contrast against whatever sits behind it; the surface is translucent.",
  guidance: {
    useWhen: [
      "a showcase card over a colourful or image background, such as a membership card or profile preview",
    ],
    avoidWhen: [
      "dense grids of cards, where many moving surfaces compete — use card",
      "an opaque card that only needs the tilt — use tilt-card",
    ],
    alternatives: ["tilt-card", "glow-card", "card"],
  },
});
