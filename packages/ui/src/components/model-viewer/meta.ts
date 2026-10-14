import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "model-viewer",
  title: "Model Viewer",
  description:
    "A glTF or GLB model people can turn and zoom, behind a poster, with three.js loaded only when the model is — never without WebGL.",
  category: "display",
  status: "experimental",
  dependencies: ["three"],
  registryDependencies: ["button", "use-in-view", "use-reduced-motion"],
  files: ["model-viewer.tsx"],
  a11y:
    'The poster carries the alt text until the model is ready; then a named, focusable region does ("3D model: …"), ' +
    "with a hint that the arrow keys turn it and plus and minus zoom. A status line says when it is loading, ready, " +
    "or unavailable, and a visible note says so when the picture stands in. It turns on its own only while on " +
    "screen and not hovered or focused, and never under reduced motion. The canvas is aria-hidden.",
  guidance: {
    useWhen: [
      "a product page where turning the object helps — hardware, furniture, a character",
    ],
    avoidWhen: [
      "a decorative 3D flourish — use cube, tilt-card or shader-background",
      'pages on slow connections without `reveal="interaction"` — models are heavy',
    ],
    alternatives: ["device-mockup", "cube", "image-ring"],
  },
  composesWith: ["product-card", "tabs"],
  controls: {
    exposure: { min: 0.2, max: 3, step: 0.1 },
  },
});
