import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "resizable",
  title: "Resizable",
  description:
    "Panels side by side or stacked, with handles to resize them by pointer or keyboard, limits per panel, and panels that collapse.",
  category: "layout",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["resizable.tsx"],
  a11y:
    'Each handle is a window splitter: a focusable role="separator" whose value is the size of the panel before ' +
    "it, with that panel as aria-controls and its limits as the value range. Arrow keys resize in reading " +
    "direction (Shift for ten times the step), Home and End go to the limits, and Enter collapses and restores a " +
    'collapsible panel. Name a handle with aria-label when a page has more than one — "Resize sidebar".',
  guidance: {
    useWhen: [
      "an editor, inbox or IDE layout where the reader decides how much room each part gets",
      "a sidebar the reader may want to widen or close",
    ],
    avoidWhen: [
      "a fixed responsive layout — use CSS grid",
      "showing and hiding a side panel without resizing — use sheet or sidebar",
    ],
    alternatives: ["sidebar", "sheet", "collapsible"],
  },
  composesWith: ["sidebar", "file-tree", "code-block"],
});
