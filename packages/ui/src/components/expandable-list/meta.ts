import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "expandable-list",
  title: "Expandable List",
  description:
    "A list of compact rows — jobs, releases, people — each growing into a detail dialog out of its place in the list.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority", "motion", "radix-ui"],
  registryDependencies: [],
  files: ["expandable-list.tsx"],
  a11y:
    'Each row is a button with aria-haspopup="dialog" and aria-expanded. The detail is a Radix modal dialog: ' +
    "focus moves in and is trapped, the page behind is inert, it is named by the item's title and described by " +
    "its content, and Escape, the backdrop or the named Close button dismiss it — after which focus returns to " +
    "the row that opened it. Row media is aria-hidden. The grow-from-row animation uses motion's layoutId inside " +
    'MotionConfig reducedMotion="user", so under reduced motion the dialog appears in place.',
});
