import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "hold-button",
  title: "Hold Button",
  description:
    "A button that confirms only after being held: ink sweeps across it while pressed, drains back if let go, and settles into a tick when the hold completes.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["hold-button.tsx"],
  a11y:
    'A real button named by its resting label throughout; the hold instructions ("Press and hold to confirm.") ' +
    "are attached with aria-describedby and the confirmation is announced once through a polite live region. " +
    "Holding Enter or Space works like holding the pointer, and focus leaving lets go. A click on its own does " +
    "nothing, so a screen reader's synthetic browse-mode click cannot confirm: users hold the key in focus/forms " +
    "mode, or long-press on touch. Once confirmed the button is aria-disabled (without dimming) until resetAfter. " +
    "The ink copy, icon, tick and changing labels are aria-hidden. Under reduced motion the full hold is still " +
    "required, the ink moves in quarter steps without a sweep and the label shows the percentage held.",
});
