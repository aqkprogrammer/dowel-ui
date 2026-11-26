import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "heart-rate",
  title: "Heart Rate",
  description:
    "A live pulse monitor: an ECG trace swept by a write-head, a heart that beats with it, and the rate in bpm.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["use-in-view", "use-reduced-motion"],
  files: ["heart-rate.tsx"],
  a11y:
    'A labelled group ("Heart rate", or `label`) whose rate is real text, so it is read as "72 bpm". The trace and ' +
    'the heart are aria-hidden decoration. Changes are announced in a polite role="status" region at most once per ' +
    "`announceEvery` ms (5 s by default), never on every beat. Status is not colour alone: warning and critical add a " +
    'word ("Elevated", "Critical", or `statusLabel`) beside the rate. The loop stops off screen and in hidden tabs; ' +
    "under reduced motion the trace is drawn once, still, and the heart does not beat.",
  guidance: {
    useWhen: [
      "a live vital sign or any steady rhythmic signal on a health or fitness dashboard",
    ],
    avoidWhen: [
      "a value that is not a rhythm — use metric-delta or meter",
      "clinical monitoring, where a decorative trace could be mistaken for real ECG data",
    ],
    alternatives: ["metric-delta", "meter", "audio-visualizer"],
  },
});
