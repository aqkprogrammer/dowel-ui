import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dot-matrix-loader",
  title: "Dot Matrix Loader",
  description:
    "An AI thinking pill: a 9×9 LED dot matrix playing one of eight rhythms — Game of Life, a breathing ring, an orbit, a face — beside a shimmering label.",
  category: "ai",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["shimmer-text"],
  files: ["dot-matrix-loader.tsx"],
  a11y:
    'The root is a single role="status" region announcing the label (or `srLabel`, "Loading" by default). ' +
    "The canvas matrix is aria-hidden. It is an indicator: under reduced motion it runs at half speed rather than " +
    "stopping, while the label's shine is dropped. It pauses off screen and in background tabs. The capsule is dark in both themes and the label keeps at least 4.5:1 against it. " +
    "The matrix never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: [
      "a showpiece wait while a model thinks, on a chat surface or a hero demo",
      "several concurrent agents, each with its own pattern or tone",
    ],
    avoidWhen: [
      "a quiet inline wait inside running text — use ai-loader",
      "a busy button or panel unrelated to AI — use spinner",
    ],
    alternatives: ["ai-loader", "grid-loader", "ai-agent-status"],
  },
});
