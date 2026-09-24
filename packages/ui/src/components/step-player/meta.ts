import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "step-player",
  title: "Step Player",
  description:
    "A stepped progress track with a play, pause and replay button: the current dot stretches into a bar that fills over its duration.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["step-player.tsx"],
  a11y:
    "The round button is named for what it will do — Play, Pause or Replay (localisable with `controlLabels`) — " +
    'and its icon is aria-hidden. The track is a progressbar with aria-valuetext "Step 2 of 5" (plus the step\'s ' +
    'label), or, when `seekable`, an ordered list of step buttons with aria-current="step" and a single tab stop: ' +
    "arrow keys (mirrored right to left), Home and End move focus and seek. Every step button's hit area is at " +
    "least 24px square at any size. Nothing is announced while it plays. Timing is a requestAnimationFrame clock, so " +
    "it keeps running under reduced motion, while the stretch, slide and icon morph — CSS transitions through the " +
    "motion scale — become instant. Time while the page is hidden is not counted.",
});
