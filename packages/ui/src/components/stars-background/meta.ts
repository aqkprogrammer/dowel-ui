import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "stars-background",
  title: "Stars Background",
  description:
    "A deep night sky behind content: three parallax layers of individually twinkling stars drift at their own speeds, with the odd shooting star.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["stars-background.tsx", "stars-background-sim.ts"],
  a11y:
    "The sky is pure decoration: the canvas is aria-hidden and ignores the pointer, and children render above " +
    "it in their own layer, so headings, links and buttons placed inside keep their roles, focus order and " +
    "hit areas. The pointer parallax is an optional flourish that needs no input to make sense and is " +
    "tracked on the root without capturing events. The loop pauses off-screen and in hidden tabs; under " +
    "reduced motion (or a --motion-scale near zero) it draws one still frame — the same sky at rest, with no " +
    "shooting stars and no parallax. Star colour is a theme token, so contrast with overlaid text is the " +
    "theme's; keep text on a solid or blurred surface where the sky is dense.",
});
