import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "animated-checklist",
  title: "Animated Checklist",
  description:
    "A task list whose boxes fill with a bounce and whose done tasks fade and strike through, with an add row.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["checkbox"],
  files: ["animated-checklist.tsx"],
  a11y:
    "A labelled group holding a real list. Each row is Dowel's Checkbox inside a <label>, so the whole row " +
    "toggles with a click and the box with Space. The add row is a button that becomes a text field: Enter " +
    'adds, Escape cancels and returns focus to "Add new task". Optional remove buttons are named per task and ' +
    "move focus to a neighbour. Additions and removals are announced politely. Name the group with aria-label.",
});
