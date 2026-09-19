import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "morph-surface",
  title: "Morph Surface",
  description:
    "A dock that grows in place into a panel — a feedback form or a quick prompt — and shrinks back when done.",
  category: "overlay",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["morph-surface.tsx"],
  a11y:
    "Behaves as a non-modal popover. The trigger is a disclosure button (aria-expanded, aria-controls) and the " +
    'panel a named role="dialog". Opening moves focus into the panel (the message box in MorphSurfaceForm); ' +
    "Escape collapses it and returns focus to the trigger; pressing or tabbing outside collapses it without " +
    "moving focus. A collapsed panel is inert and invisible; an expanded surface's dock is inert. " +
    "MorphSurfaceForm's message box is labelled by the panel label, submits with ⌘/Ctrl + Enter " +
    "(aria-keyshortcuts) or a named submit button, and a successful send is announced through a polite status " +
    "region. The resize and fades stop under reduced motion.",
});
