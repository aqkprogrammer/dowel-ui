import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "folding-frame",
  title: "Folding Frame",
  description:
    "A photo folded shut like a book in 3D — drag across it (or use the keys) to open the cover until it lies flat.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["folding-frame.tsx"],
  a11y:
    'The photo is exposed once, as role="img" named by `alt`; halves, spine, shading and the hinge band are ' +
    'presentational inside it. A focusable role="slider" overlay (default name "Unfold", 0–100) carries the ' +
    'openness with aria-valuetext "Closed", "40% open" or "Open". Arrows step by 5 (left/right follow the ' +
    "reading direction), Page Up/Down by 25, Home shuts and End opens. The drag follows pointer position rather " +
    "than momentum and mirrors in right-to-left layouts. Key steps and the optional release snap ease with a CSS " +
    "transition that is instant under reduced motion. The liquid refraction is Chromium-only; other engines get " +
    'the blur alone (data-liquid="fallback").',
});
