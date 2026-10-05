import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "share-button",
  title: "Share Button",
  description:
    "A Share pill that springs open into a staggered row of share targets, with a built-in copy-link target and an optional hand-off to the native share sheet.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["share-button.tsx"],
  a11y:
    "The trigger is a button named by its label, with aria-expanded and aria-controls pointing at a group " +
    'labelled "Share to" of links and buttons, each named by its target. Keyboard focus opens it as well as ' +
    "hover; Arrow keys move between the trigger and the targets; Escape collapses it and returns focus to the " +
    "trigger; focus leaving closes it. Touch and keyboard press toggle it, so nothing depends on hover. " +
    'Copying the link is announced through a polite role="status" region and the check only appears once the ' +
    "clipboard write has resolved. Icons are aria-hidden. Under reduced motion the springs become instant.",
});
