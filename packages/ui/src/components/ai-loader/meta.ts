import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-loader",
  title: "AI Loader",
  description:
    "A labelled AI waiting indicator — thinking dots, an indeterminate bar or a thinking grid — with an optional elapsed-seconds counter.",
  category: "ai",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["bar-loader", "dots-loader", "grid-loader"],
  files: ["ai-loader.tsx"],
  a11y:
    'The root is a single role="status" region announcing the label (or `srLabel`, "Loading" by default). The ' +
    "loader inside it and the elapsed counter are aria-hidden — a counter ticking ten times a second inside a " +
    "live region would announce continuously. The loaders are indicators: under reduced motion they slow rather " +
    "than stop. None fakes determinate progress.",
  guidance: {
    useWhen: ["a labelled wait while a model thinks, with an optional elapsed-seconds counter"],
    avoidWhen: [
      "a busy button or panel unrelated to AI — use spinner",
      "waiting for a generated image — use grid-reveal",
    ],
    alternatives: ["spinner", "grid-reveal", "ai-agent-status"],
  },
});
