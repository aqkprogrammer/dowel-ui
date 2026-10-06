import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dots-loader",
  title: "Dots Loader",
  description:
    "Indeterminate loading indicators made of dots — pulse, bounce, ripple, orbit and 21 more motions.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["dots-loader.tsx"],
  a11y:
    "Renders aria-hidden by default so it does not announce inside controls that already " +
    'expose a busy state. Pass `label` to announce it standalone via role="status". ' +
    "Under reduced motion it slows rather than stopping, because a frozen loader reads as a hang.",
  guidance: {
    useWhen: ["a decorative indeterminate wait drawn as dots, such as pulse or bounce"],
    avoidWhen: [
      "a standard wait in a button or panel — use spinner",
      "waiting on a model with a label — use ai-loader",
    ],
    alternatives: ["spinner", "ai-loader"],
  },
});
