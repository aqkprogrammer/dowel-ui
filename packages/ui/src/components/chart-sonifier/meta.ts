import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "chart-sonifier",
  title: "Chart Sonifier",
  description:
    "Hear a chart: each series played as pitch over time, and a slider that steps through it and speaks each value.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["chart-sonifier.tsx", "sonify.ts", "use-sonifier.ts"],
  a11y:
    "Nothing makes a sound until someone presses Play or moves the slider — the audio context is only created " +
    "then — and Pause, Escape from anywhere in the group, and Mute silence it at once, with a fade too short to " +
    "hear. Everything the sound conveys is also text: a one-sentence summary of the chosen series (range, " +
    "overall trend, highest and lowest points) describes the group, and the slider's aria-valuetext reads " +
    '"Tue 14 Oct: 42 deployments" for each point. Arrow keys step a point, Page keys a tenth, Home and End go ' +
    "to the ends, and each step plays that point's note unless muted. While playing, the thumb follows the " +
    "playhead but the announced value holds still, so a screen reader does not talk over the notes; on pause " +
    'the new position is announced once through a status region ("Paused at …"), unless the slider has focus ' +
    "and announces it itself. Play is named for what it will do (Play or Pause); Mute is a toggle button with " +
    "aria-pressed; speed is a native radio group and the series a native select. Where the Web Audio API is " +
    "missing, Play is disabled and says why, and the slider still reads every value.",
});
