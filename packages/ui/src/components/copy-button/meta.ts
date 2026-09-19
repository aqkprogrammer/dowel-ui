import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "copy-button",
  title: "Copy Button",
  description:
    "Copies a value to the clipboard and morphs its icon and label into a confirmation that reverts on its own.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["copy-button.tsx"],
  a11y:
    'The confirmation is announced through a polite role="status" region rendered beside the ' +
    "button, so it never becomes part of the button's name. Only the visible label is exposed; " +
    'the hidden one is aria-hidden. Icon-only buttons are named "Copy" unless given an aria-label. ' +
    "A refused clipboard write is announced as a failure and never shows the check. The button " +
    "is never disabled while confirming, so keyboard focus stays put.",
});
