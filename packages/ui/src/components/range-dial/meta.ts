import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "range-dial",
  title: "Range Dial",
  description:
    "A 24-hour circular two-thumb range — drag or key the start and end round a ticked clock face, with the duration in the middle.",
  category: "form",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["range-dial.tsx"],
  a11y:
    'A labelled role="group" (default "Time range") holding two focusable role="slider" thumbs ("Start time", ' +
    '"End time"), each with aria-valuemin 0, aria-valuemax 1439, aria-valuenow in minutes and an aria-valuetext ' +
    'time such as "10:30 PM" (locale-aware, overridable). Arrow keys step by the snap, Page Up/Down by an hour, ' +
    "Home/End jump to midnight and the last step of the day, all wrapping round midnight; up/right always add time " +
    "because a clock face does not mirror. The centre readout has a spoken equivalent, and a polite live region " +
    "announces the new duration only after a change. Ticks and knobs are aria-hidden; the pointer grabs the " +
    "nearest thumb and moves focus to it. Tick draw-in runs through --motion-scale and is instant under reduced motion.",
});
