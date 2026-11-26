import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "pulse-dots",
  title: "Pulse Dots",
  description: "A typing indicator of three dots that swell and fade in sequence.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["pulse-dots.tsx"],
  a11y:
    'The root is role="status" with a visually hidden label ("Typing" by default, set with `label`), so it is ' +
    "announced once when it appears; the dots are aria-hidden. It is an indicator, marked " +
    'data-motion="indicator": under reduced motion it slows to half speed rather than freezing, because a ' +
    "still typing indicator reads as a dropped connection. The wave never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: [
      "showing that the other side of a chat is typing",
      "a small inline wait inside a bubble",
    ],
    avoidWhen: [
      "a page or panel load — use spinner",
      "waiting on a model with a visible label — use ai-loader",
    ],
    alternatives: ["dots-loader", "spinner", "ai-loader"],
  },
});
