import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "time-stack",
  title: "Time Stack",
  description:
    "Cards receding in depth, stepped through with a timeline scrubber, the mouse wheel or the arrow keys.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["time-stack.tsx"],
  a11y:
    'The scrubber is a vertical role="slider" whose aria-valuetext names the moment ("1w ago: Forest Trail"). ' +
    "Newest is at the bottom, so ArrowUp/ArrowRight go back in time as a vertical slider requires; ArrowDown/Left, " +
    "Page Up/Down, Home and End work too. Only the current card is exposed (a labelled group); the cards behind " +
    "and before it are inert. Wheel steps are announced through a polite status, and the wheel only captures " +
    "scrolling while there is a card to step to. Motion stops under reduced motion.",
});
