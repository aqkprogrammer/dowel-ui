import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "glass-bubble",
  title: "Glass Bubble",
  description:
    "A draggable glass lens that refracts the content under it, with a specular highlight and chromatic fringing.",
  category: "effects",
  status: "beta",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["glass-bubble.tsx"],
  a11y:
    'The bubble is a 2D slider (role="slider", default name "Glass bubble") with aria-valuetext "<x> across, ' +
    '<y> down" in percent of travel. Arrow keys move it 2% (Shift: 6%), mirrored in right-to-left layouts; Home ' +
    "centres it; it has the shared focus ring. Highlight and rim layers are aria-hidden. The refracting lens is " +
    "an SVG backdrop-filter that only Chromium supports; other engines get a blur-and-saturate bubble instead, " +
    'and data-lens="svg" | "fallback" on the root reports which. Nothing moves on its own; the shadow ' +
    "transition while held runs on the duration tokens, so reduced motion stops it.",
});
