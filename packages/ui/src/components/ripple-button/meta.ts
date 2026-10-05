import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ripple-button",
  title: "Ripple Button",
  description:
    "A Button that sends a ripple out from wherever it is pressed — concurrent ripples stack, and Enter or Space ripple from the centre.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["ripple-button.tsx"],
  a11y:
    "A native button with every Button behaviour, including loading and disabled. Ripples are aria-hidden, " +
    "pointer-transparent spans that remove themselves when they finish, so they never reach the accessibility " +
    "tree or block a click. Keyboard presses (Enter, Space) ripple from the centre, so the feedback does not " +
    "depend on a pointer. Under reduced motion the ripple is collapsed to an instant and disappears.",
});
