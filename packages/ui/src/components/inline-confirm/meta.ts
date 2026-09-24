import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "inline-confirm",
  title: "Inline Confirm",
  description:
    "A destructive button that asks in place — it widens into Keep / Delete, or opens a bin's lid beside a check and a cross, then offers a timed Undo.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["inline-confirm.tsx"],
  a11y:
    'A labelled group of real buttons. Asking moves focus to "Keep", the safe answer; Escape cancels and ' +
    'returns focus to the trigger. Confirming moves focus to "Undo" and announces the done label through a ' +
    "polite live region. The undo window pauses while keyboard focus is inside it, and its fuse stays still " +
    "under reduced motion. When the window closes, focus returns to the trigger if it was inside. " +
    "The icon variant's bin is a disclosure button (aria-expanded, aria-controls) named by `label`; its check and " +
    "cross are icon buttons named by `confirmLabel` and `cancelLabel` in visually hidden text, and the closed panel " +
    "is inert. The same focus rules apply — the cross when asking, the bin on backing out, Undo once done — and with " +
    "`undoWindow={0}` focus stays on the bin, now aria-disabled and named by `doneLabel`. The lid, panel and check " +
    "are CSS transitions that collapse under reduced motion.",
});
