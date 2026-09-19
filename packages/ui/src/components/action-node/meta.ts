import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "action-node",
  title: "Action Node",
  description:
    "A workflow node card whose round action buttons spring out in an arc around its top-end corner on hover or from a More actions trigger.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["avatar", "tooltip"],
  files: ["action-node.tsx", "action-node-spring.ts"],
  a11y:
    'Hover opens the fan, and so does the "More actions" trigger (aria-expanded, aria-controls), which is revealed on ' +
    "hover and keyboard focus and always shown on devices without hover. Enter, Space or ArrowDown on it open the fan " +
    'and focus the first action. The fan is role="toolbar" (named by toolbarLabel) with a roving tab stop: the arrow ' +
    "keys move along the arc (Left/Right mirrored in right-to-left layouts) with wrap-around, Home/End jump to the ends, " +
    "and Escape closes it and returns focus to the trigger. Closed, the fan is inert and aria-hidden, so tucked buttons " +
    "are neither focusable nor announced. Every action is an icon button named by aria-label and repeated in a tooltip. " +
    "The hover bridge is aria-hidden; the springs are CSS transitions that settle at once under reduced motion.",
});
