import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "audio-visualizer",
  title: "Audio Visualizer",
  description:
    "What a microphone is hearing, drawn live — bars, a wave or a breathing orb — from a MediaStream or a level your own pipeline supplies.",
  category: "ai",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["dither-canvas"],
  files: ["audio-visualizer.tsx"],
  a11y:
    "Decoration by default (aria-hidden); give it a `label` and it becomes a named image. It shows whether input " +
    "is being picked up, so — like a loader — it keeps updating under reduced motion while live, without easing; " +
    "with no input it rests. Never make it the only sign that recording is on: say so in text too, as " +
    "voice-input does.",
  guidance: {
    useWhen: [
      "showing a user their microphone is live while they speak to an assistant",
      "a call or recording interface's input level",
    ],
    avoidWhen: [
      "an AI that is thinking, with no audio — use ai-loader or fluid-orb",
      "a decorative wave — use bar-loader's voice-wave variant",
    ],
    alternatives: ["voice-input", "fluid-orb", "bar-loader"],
  },
  composesWith: ["voice-input", "ai-prompt-input"],
  controls: {
    level: { min: 0, max: 1, step: 0.05 },
    bands: { min: 3, max: 64, step: 1 },
    color: { kind: "color" },
  },
});
