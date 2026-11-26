import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ring-dots",
  title: "Ring Dots",
  description:
    "A loading indicator of eight dots on a ring, with a few larger, brighter dots chasing round it.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["ring-dots.tsx"],
  a11y:
    'The root is role="status" and holds a visually hidden label ("Loading" by default, set with `label`); the dots are aria-hidden. ' +
    "Pass a label that says what is loading. It is a pure progress indicator, so under reduced motion it slows to half speed " +
    "rather than freezing, because a stopped loader reads as a hang. The chase runs clockwise in every writing direction.",
  guidance: {
    useWhen: ["an indeterminate wait shown as a compact, quiet ring of dots"],
    avoidWhen: [
      "waits that can show progress — use progress",
      "a wait inside a button — use spinner",
    ],
    alternatives: ["spinner", "dots-loader", "ring-loader"],
  },
});
