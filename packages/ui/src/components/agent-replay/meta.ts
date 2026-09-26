import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "agent-replay",
  title: "Agent Replay",
  description:
    "Step through a finished agent run — each call, what the agent was told, and every take-over and hand-back — by button, slider or playback.",
  category: "ai",
  status: "experimental",
  dependencies: [],
  registryDependencies: ["agent-surface"],
  files: ["agent-replay.tsx"],
  a11y:
    'A named section. The step slider is a native range input whose value text names the step ("Step 3 of ' +
    '12: Sorted deals by amount"), so arrow keys, Home and End move through the run and say where they land. ' +
    "The controls are labelled buttons in a named group; Play is a toggle button and stops at the last step " +
    "rather than looping. A polite status region, present from first paint, announces the step you move to — " +
    "and stays quiet during playback, which would otherwise talk over itself. The step list marks the current " +
    'step with aria-current="step". Status, source and corrections are words, and the arguments and what ' +
    "the agent was told are focusable, named regions because they scroll.",
});
