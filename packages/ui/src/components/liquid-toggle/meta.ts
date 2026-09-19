import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "liquid-toggle",
  title: "Liquid Toggle",
  description:
    "A switch whose knob squashes like a droplet as it travels, and can be dragged across.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "motion", "radix-ui"],
  registryDependencies: [],
  files: ["liquid-toggle.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, ' +
    "with a visible focus ring (missing in the source) and a hidden input inside forms. It has no visible " +
    "label, so name it with aria-label or a <label>. Dragging the knob is a pointer convenience; releasing " +
    "a drag never also counts as a click. Under reduced motion the knob jumps and never deforms.",
});
