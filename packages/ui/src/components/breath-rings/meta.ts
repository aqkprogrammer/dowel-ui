import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "breath-rings",
  title: "Breath Rings",
  description:
    "A filled dot inside two thin rings that breathe in and out on a slow loop, for an idle or listening state.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["breath-rings.tsx"],
  a11y:
    'The artwork is aria-hidden. Pass `label` to announce the state through a polite role="status" region; ' +
    "omit it when the surrounding control already reports that it is listening. It is decorative rather than " +
    "a progress indicator, so under reduced motion the loop runs once in an instant and the rings settle at rest. " +
    "Durations scale with --motion-scale, and the colour follows currentColor.",
  guidance: {
    useWhen: [
      "a calm idle or listening cue, such as a voice assistant waiting for speech",
      "a presence marker that should feel alive without demanding attention",
    ],
    avoidWhen: [
      "work is in progress and must keep reporting it under reduced motion — use spinner or dots-loader",
      "recording levels matter — use audio-visualizer",
    ],
    alternatives: ["dots-loader", "spinner", "voice-input"],
  },
});
