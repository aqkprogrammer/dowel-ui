import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "magnetic-select",
  title: "Magnetic Select",
  description:
    "A honeycomb of round chips: choosing one grows it and magnetically shoves the rest apart, tilted, with a springy settle.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["magnetic-select.tsx", "magnetic-select-spring.ts"],
  a11y:
    'A role="radiogroup" of native buttons with role="radio" and aria-checked, named by each option\'s `label`; the group ' +
    "needs aria-label or aria-labelledby and warns in development without one. Roving tabindex: Tab reaches the " +
    "selected chip (or the first), arrow keys move focus and select with wrap-around (Left/Right follow the reading " +
    "direction in RTL), Home/End jump to the ends. Images and skins are decorative. The spring is a CSS transition, " +
    "so under reduced motion every chip settles at its final pose immediately; cursor parallax is mouse-only.",
});
