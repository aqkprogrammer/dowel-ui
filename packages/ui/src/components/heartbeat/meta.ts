import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "heartbeat",
  title: "Heartbeat",
  description:
    "An ECG line with a bright pulse sweeping across it and a fading tail, above a heart that beats in time with the bpm reading.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["heartbeat.tsx"],
  a11y:
    "The trace and heart glyph are aria-hidden; the reading is plain text prefixed by a visually hidden " +
    '`label`, so it reads "Heart rate 72 bpm". It is deliberately not a live region, since a reading that ' +
    "updates constantly would never stop announcing. The sweep and beat are decorative loops: under " +
    "reduced motion they stop and the full trace is shown bright and still.",
  guidance: {
    useWhen: ["showing a heart rate or other pulse-like vital with a lively monitor trace"],
    avoidWhen: [
      "plotting a real series of values over time — use dither-line",
      "a generic audio or activity level — use audio-visualizer",
    ],
    alternatives: ["dither-line", "audio-visualizer", "metric-delta"],
  },
});
