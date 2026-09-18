import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "scramble-text",
  title: "Scramble Text",
  description:
    "Text whose characters churn through random glyphs and resolve from the inline start, on hover, focus, mount or view.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["scramble-text.tsx"],
  a11y:
    "The scrambling glyphs are aria-hidden; an sr-only copy of the real text is what assistive technology reads, " +
    "so nothing is announced per frame. The server renders the real text. It is not itself interactive: hover and " +
    "keyboard focus on the nearest link or button that wraps it trigger the effect. No scramble under reduced motion.",
});
