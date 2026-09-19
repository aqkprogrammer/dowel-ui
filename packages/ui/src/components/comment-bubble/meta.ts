import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "comment-bubble",
  title: "Comment Bubble",
  description:
    "A canvas comment pin — an avatar in a speech-bubble corner that grows into the thread and a reply composer.",
  category: "display",
  status: "beta",
  dependencies: [],
  registryDependencies: ["avatar"],
  files: ["comment-bubble.tsx"],
  a11y:
    'The avatar is a disclosure button ("Comment by <name>, N replies") with aria-expanded and aria-controls. ' +
    "The thread is a labelled group and an ordered list; while collapsed it is invisible and inert. Opening moves " +
    "focus to the reply field when there is one; Escape collapses the thread and returns focus to the avatar; a " +
    "press outside collapses it. The reply field and send button are named. The grow and blur stop under reduced motion.",
});
