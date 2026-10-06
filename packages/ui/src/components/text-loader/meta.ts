import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "text-loader",
  title: "Text Loader",
  description:
    "Indeterminate loading indicators made of words and interface shapes — shimmer, typing, skeleton, terminal and 15 more motions.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["text-loader.tsx"],
  a11y:
    "Renders aria-hidden by default so it does not announce inside controls that already " +
    'expose a busy state; the words it shows are decoration. Pass `label` to announce it standalone via role="status". ' +
    "Under reduced motion it slows rather than stopping, because a frozen loader reads as a hang.",
  guidance: {
    useWhen: [
      "a decorative indeterminate wait drawn as words or interface shapes, such as typing or a terminal",
    ],
    avoidWhen: [
      "placeholders that hold the real layout — use skeleton",
      "a standard wait in a button or panel — use spinner",
    ],
    alternatives: ["skeleton", "spinner", "ai-loader"],
  },
});
