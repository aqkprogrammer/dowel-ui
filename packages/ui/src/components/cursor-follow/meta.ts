import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "cursor-follow",
  title: "Cursor Follow",
  description:
    "A dot that trails the pointer on a spring inside a container and swells into a label over marked elements.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["cursor-follow.tsx"],
  a11y:
    "Purely decorative: the follower is aria-hidden and ignores the pointer, and the container adds no role " +
    'or tab stop (the source\'s role="application" and tabIndex are dropped). A `data-cursor-text` label is ' +
    "shown only by the follower, so the same words must also be in the element's alt text or visible text. " +
    "Nothing renders for touch input or under reduced motion. Hiding the system cursor is opt-in " +
    '(`hideCursor`). The spring is `motion`, wrapped in MotionConfig reducedMotion="user".',
});
