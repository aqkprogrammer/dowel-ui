import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "orbit-dots",
  title: "Orbit Dots",
  description:
    "A loading indicator: a large centre dot inside a faint ring, with two satellites orbiting at different radii and speeds.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["orbit-dots.tsx"],
  a11y:
    'A visually hidden role="status" announces `label` ("Loading" by default); pass an empty label when ' +
    "a surrounding control already reports its busy state. The drawing is aria-hidden. It is an " +
    'indicator (data-motion="indicator"): under reduced motion it slows on --motion-scale-indicator ' +
    "rather than freezing, because a stopped loader reads as a hang.",
  guidance: {
    useWhen: ["a decorative, planetary indeterminate wait in an empty state or splash"],
    avoidWhen: [
      "a standard wait in a button or panel — use spinner",
      "a row of dots — use dots-loader",
    ],
    alternatives: ["spinner", "dots-loader", "ring-loader"],
  },
});
