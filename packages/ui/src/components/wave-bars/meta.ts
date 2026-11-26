import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "wave-bars",
  title: "Wave Bars",
  description:
    "Rounded vertical bars whose heights ripple in a travelling wave, for voice or audio activity.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["wave-bars.tsx"],
  a11y:
    'With `label` the root is role="status" and the label is visually hidden text, so it is announced once rather than ' +
    "on every frame; without a label the whole indicator is aria-hidden and should sit beside visible text. It is an " +
    'indicator (data-motion="indicator"): under reduced motion the wave slows to half speed instead of freezing, because ' +
    "a still meter would falsely say nothing is being heard. Set `active={false}` to settle the bars when there is silence. " +
    "The wave never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: [
      "showing that a microphone is listening or audio is playing",
      "a compact speaking indicator beside an assistant or a call participant",
    ],
    avoidWhen: [
      "showing real audio levels — use audio-visualizer",
      "generic loading — use bar-loader or dots-loader",
    ],
    alternatives: ["audio-visualizer", "bar-loader", "voice-input"],
  },
});
