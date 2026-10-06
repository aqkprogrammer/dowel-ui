import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "alert-dialog",
  title: "Alert Dialog",
  description:
    "A confirmation modal whose card springs up out of a blur while the backdrop blurs in behind it; the destructive tone shakes its icon once on open.",
  category: "overlay",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: ["button"],
  files: ["alert-dialog.tsx"],
  a11y:
    'Radix AlertDialog: the content has role="alertdialog", is named by AlertDialogTitle and ' +
    "described by AlertDialogDescription — render both, and make the description say what will be " +
    "lost. Focus is trapped while open, lands on Cancel (the safe choice) and returns to the trigger " +
    "on close. Escape cancels; clicking outside does not dismiss, so a consequential choice is never " +
    "made by accident. The media tile and its one-off shake are aria-hidden decoration, and colour " +
    "is never the only warning. Every entrance, stagger and the shake collapse under reduced motion.",
  guidance: {
    useWhen: [
      "confirming a destructive or irreversible action",
      "a choice that must not be dismissed by clicking outside",
    ],
    avoidWhen: [
      "collecting input or showing general content — use dialog",
      "a deletion serious enough to make the person type the name — use confirm-typed",
      "a quick delete in a list row that can be undone — use inline-confirm",
    ],
    alternatives: ["dialog", "confirm-typed", "inline-confirm", "hold-button"],
  },
});
