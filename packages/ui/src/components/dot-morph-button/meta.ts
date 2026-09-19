import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dot-morph-button",
  title: "Dot Morph Button",
  description:
    "A pill button led by a dot that stretches into a bar on hover and keyboard focus.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["dot-morph-button.tsx"],
  a11y:
    "The dot is aria-hidden decoration; the button is named by its label. The morph runs on " +
    "keyboard focus as well as hover, and hover only applies on devices that can hover, so a " +
    "tap never leaves it stuck. Under reduced motion the change is instant.",
});
