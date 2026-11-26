import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "swipe-actions",
  title: "Swipe Actions",
  description:
    "A list row that drags toward the inline start to reveal action buttons, which stretch with the drag before the row springs open or shut.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["swipe-actions.tsx"],
  a11y:
    "Swiping is a pointer shortcut, never the only route: the actions are native buttons that stay in the " +
    "tab order, and focusing one opens the row so it is visible; focus leaving the row closes it. Escape " +
    "closes the row and returns focus to it, and choosing an action closes it too. Icon-only actions are " +
    "named by their `label`. The root is a group (name it with aria-label). Directions mirror in RTL. The " +
    "spring runs on the motion scale, so under reduced motion the row snaps open and shut.",
  guidance: {
    useWhen: [
      "a touch-first list where each row has one or two quick actions such as archive or delete",
    ],
    avoidWhen: [
      "rows with many actions — use dropdown-menu",
      "actions that should be discoverable without a gesture on desktop — use context-menu or visible buttons",
    ],
    alternatives: ["dropdown-menu", "context-menu"],
  },
});
