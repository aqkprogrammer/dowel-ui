import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "text-reveal",
  title: "Text Reveal",
  description:
    "A word whose letters roll vertically in a staggered left-to-right wave when the text changes or on a loop.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["text-reveal.tsx"],
  a11y:
    "The text is exposed once as plain text through a visually hidden copy; the per-letter rolling stage " +
    "is aria-hidden, so a screen reader never spells the word out and the loop never announces anything. " +
    "Under reduced motion each roll snaps to its final frame and the ambient loop does not start.",
  guidance: {
    useWhen: [
      "a headline word or short label that should roll in when it changes, split-flap style",
    ],
    avoidWhen: [
      "a changing number — use number-flow",
      "long sentences, where a per-letter wave becomes noise",
    ],
    alternatives: ["number-flow", "highlight-text"],
  },
});
