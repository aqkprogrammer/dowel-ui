import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "gradient-text",
  title: "Gradient Text",
  description:
    "Text filled with a gradient of theme colours that can drift slowly across the letters — still one run of real, selectable text.",
  category: "effects",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["gradient-text.tsx"],
  a11y:
    "The text is never split or replaced: it reads, selects and copies as written. The drift is decoration and " +
    "holds still under reduced motion. In forced-colours mode the gradient is dropped and the text takes the " +
    "system colour. Choose colours that each meet contrast against the background — the gradient passes " +
    "through all of them.",
  guidance: {
    useWhen: [
      "one word or phrase in a hero heading that should carry the brand colours",
      "a stat or label that needs emphasis without a badge",
    ],
    avoidWhen: [
      "body text — a gradient makes long text harder to read",
      "a shine sweeping across text — use shimmer-text",
    ],
    alternatives: ["shimmer-text", "highlight-text", "text-effect"],
  },
  composesWith: ["text-effect", "aurora-background"],
  controls: {
    angle: { min: 0, max: 360, step: 5 },
    duration: { min: 1, max: 20, step: 0.5 },
  },
});
