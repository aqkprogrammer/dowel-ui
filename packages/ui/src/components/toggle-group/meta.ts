import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "toggle-group",
  title: "Toggle Group",
  description:
    "A set of toggles whose highlight slides between choices on a spring in single mode, and springs into each pressed item in multiple mode.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "motion", "radix-ui"],
  registryDependencies: ["toggle"],
  files: ["toggle-group.tsx"],
  a11y:
    "Radix ToggleGroup: one tab stop for the whole group, with arrow keys moving between items. In " +
    "single mode the group is a radiogroup and each item a radio with aria-checked; in multiple mode " +
    "it is a toolbar and each item a button with aria-pressed. Name the group with aria-label, and icon-only items " +
    "with their own aria-label. The sliding pill and per-item highlights are aria-hidden decoration — " +
    "selection is announced from the state, never from colour. Nothing animates on first paint, and " +
    'the springs run inside MotionConfig reducedMotion="user", so under reduced motion the pill jumps ' +
    "and highlights appear at once.",
});
