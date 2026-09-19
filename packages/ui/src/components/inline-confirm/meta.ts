import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "inline-confirm",
  title: "Inline Confirm",
  description:
    "A destructive button that asks in place — it widens into Keep / Delete, then offers a timed Undo.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["inline-confirm.tsx"],
  a11y:
    'A labelled group of real buttons. Asking moves focus to "Keep", the safe answer; Escape cancels and ' +
    'returns focus to the trigger. Confirming moves focus to "Undo" and announces the done label through a ' +
    "polite live region. The undo window pauses while keyboard focus is inside it, and its fuse stays still " +
    "under reduced motion. When the window closes, focus returns to the trigger if it was inside.",
});
