import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "notification-badge",
  title: "Notification Badge",
  description:
    "A dot, rolling count or presence badge pinned to the corner of an icon, button or avatar.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["badge", "number-flow"],
  files: ["notification-badge.tsx"],
  a11y:
    'Colour never carries the meaning alone: every badge has screen-reader text ("3 notifications", "More than ' +
    '99 notifications", "New", "Online"…), overridable with `label`, while the visible digits are aria-hidden. ' +
    "A hidden count badge (zero, without showZero) is aria-hidden and empty. Changes are only announced when " +
    "`live` is set. The text follows the wrapped element in reading order, so a wrapped icon button should still " +
    "have its own name. The ping ring is not rendered under reduced motion, and the pop-in snaps.",
});
