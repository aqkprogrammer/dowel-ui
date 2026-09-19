import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "shader-transition",
  title: "Shader Transition",
  description:
    "Transitions a frame between two states under a full-frame WebGL reveal — one raw-WebGL engine and sixteen presets (aperture, chroma, prism, SDF blobs and circles, noise, wipe, stripes, spiral…).",
  category: "effects",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: [
    "shader-transition.tsx",
    "shader-transition-engine.ts",
    "shader-transition-presets.ts",
  ],
  a11y:
    "Both states are real DOM; the shader only paints a decorative, aria-hidden cover over the frame. " +
    "While a run is in progress the outgoing state is aria-hidden and inert, the incoming state is in the " +
    "accessibility tree from the first frame, and focus inside the outgoing state moves to the incoming one. " +
    "The root is aria-busy while running. Reduced motion (OS setting or --motion-scale 0) swaps instantly; " +
    "without WebGL, or if the context is lost mid-run, the states cross-fade instead.",
});
