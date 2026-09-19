import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "morph-button",
  title: "Morph Button",
  description:
    "A button whose icon and label morph to an active state — toggles, transient confirmations and hover affordances.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["morph-button.tsx"],
  a11y:
    'In `toggle` mode the state is exposed with aria-pressed and the accessible name stays the resting label, so "Mute" never becomes "Unmute, pressed". ' +
    "`transient` confirmations (Copied, Submitted) are announced through a polite live region and revert on a timer. " +
    '`trigger="hover"` activates on keyboard focus as well as hover. Icons are aria-hidden: an icon-only button must be ' +
    "named with aria-label or aria-labelledby, and warns in development when it is not. Motion stops under reduced motion.",
});
