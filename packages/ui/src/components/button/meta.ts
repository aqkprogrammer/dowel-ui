import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "button",
  title: "Button",
  description: "Triggers an action or event, with variants for every level of emphasis.",
  category: "foundation",
  status: "stable",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: ["spinner"],
  files: ["button.tsx"],
  a11y:
    "Keyboard activatable via Enter and Space. The loading state uses aria-disabled and " +
    "aria-busy rather than the disabled attribute, so focus is never stranded mid-action. " +
    'Use `size="icon"` only with an accessible name from aria-label or visually hidden text.',
  guidance: {
    useWhen: [
      "any action: submit, save, open, cancel",
      "an action that shows a busy state while it runs",
    ],
    avoidWhen: [
      "a button that stays pressed — use toggle",
      "copying to the clipboard — use copy-button",
      "confirming a destructive action — use alert-dialog",
    ],
    alternatives: ["toggle", "copy-button", "alert-dialog", "effect-button"],
  },
});
