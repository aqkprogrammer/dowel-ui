import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "effect-button",
  title: "Effect Button",
  description:
    "A Button with a hover and focus micro-interaction — slide-arrow, pulse, rotate, shake, glare, text reveal, expanding ring or clip corners.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["effect-button.tsx"],
  a11y:
    "Every effect plays on keyboard focus-visible as well as hover. Icons and decorative " +
    "layers are aria-hidden, and text-reveal's duplicate label is hidden so the name is read " +
    "once. Colour (tone) never carries meaning on its own: the label does. Effects stop under " +
    "reduced motion. Inherits Button's loading and disabled behaviour.",
});
