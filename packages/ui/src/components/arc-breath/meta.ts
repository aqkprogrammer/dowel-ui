import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "arc-breath",
  title: "Arc Breath",
  description:
    "A spinner whose single arc grows and shrinks in length as it turns over a faint track ring.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["arc-breath.tsx"],
  a11y:
    'The SVG is aria-hidden and `label` (default "Loading") is announced through a polite role="status" region; ' +
    'pass label="" when the surrounding control already exposes its busy state. It is an indicator, marked ' +
    'data-motion="indicator": under reduced motion it slows on --motion-scale-indicator rather than freezing, ' +
    "because a stopped spinner reads as a hang. It never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: ["an indeterminate wait where a single, calm arc fits better than dots"],
    avoidWhen: [
      "progress is measurable — use progress",
      "a tiny inline wait inside a button — use spinner",
    ],
    alternatives: ["spinner", "ring-loader", "dots-loader"],
  },
});
