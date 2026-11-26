import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "radar",
  title: "Radar",
  description:
    "A radar scope whose sweep rotates over faint range rings, brightening each blip as it passes and letting it fade.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["radar.tsx"],
  a11y:
    "Decorative by default: the whole scope is aria-hidden. Pass `label` and it becomes a single image with that " +
    'name (role="img"), with no focusable parts. It does not report progress, so put any real status ("Searching ' +
    'for devices…") in text, in a live region if it changes. It is not exempt from reduced motion: the sweep ' +
    "settles pointing up and the blips rest at their dim afterglow. Drawn in currentColor, so it follows the " +
    "text colour it sits in, and the scope never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: [
      "an ambient sign of searching or discovery, like finding nearby devices or people",
      "a decorative hero motif with a scanning or monitoring theme",
    ],
    avoidWhen: [
      "the only sign that work is in progress — use spinner or dots-loader, which keep moving under reduced motion",
      "showing real positions or data — this is illustration, not a chart",
    ],
    alternatives: ["spinner", "dots-loader", "globe"],
  },
});
