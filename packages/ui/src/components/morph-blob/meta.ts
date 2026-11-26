import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "morph-blob",
  title: "Morph Blob",
  description:
    "A decorative blob that morphs between a circle, a rounded square and a teardrop on a loop.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["morph-blob.tsx"],
  a11y:
    "Purely decorative: the element is aria-hidden and has no role or focus stop, so it never reaches " +
    "assistive technology; put any meaning in nearby text. The loop's duration runs through --motion-scale, " +
    "and under prefers-reduced-motion the animation is removed and the shape rests as a still circle. " +
    "`paused` holds it in place for pages that pause ambient motion on their own.",
  guidance: {
    useWhen: [
      "an ambient accent on an empty state, hero or idle screen",
      "a soft 'something lives here' mark beside an assistant or avatar",
    ],
    avoidWhen: [
      "communicating that work is in progress — use spinner or dots-loader",
      "several on one screen, where the motion competes for attention",
    ],
    alternatives: ["fluid-orb", "gradient-orb", "goo-ball"],
  },
});
