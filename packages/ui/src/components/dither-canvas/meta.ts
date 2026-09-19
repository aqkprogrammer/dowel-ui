import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dither-canvas",
  title: "Dither Canvas",
  description:
    "The engine behind the dither charts: a DPR-capped, self-pausing canvas loop, token colours, a deterministic cell hash, springs, geometry and a keyboard scrubber.",
  category: "data",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["dither-canvas.tsx", "dither-engine.ts", "dither-geometry.ts", "dither-scrubber.tsx"],
  a11y:
    'The canvas is aria-hidden by default: a chart built on it names itself with role="img" and an ' +
    "aria-label summary, and renders its values in DitherTable, which stays in the accessibility tree " +
    "when visually hidden. useDitherScrubber gives a chart cursor APG slider semantics (arrows, Page " +
    "keys, Home/End). The loop pauses off-screen and in hidden tabs, and under reduced motion (or " +
    "--motion-scale near zero) draws a single static frame with springs settled.",
});
