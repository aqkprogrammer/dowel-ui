import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "tide-switch",
  title: "Tide Switch",
  description:
    "A switch drawn as a tide pool: a glass fishbowl floats across rolling water as the pool deepens to navy.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["tide-switch.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, ' +
    "with a focus ring and a hidden input inside forms. The artwork is aria-hidden with no visible label, so " +
    "name it with aria-label or a <label>. The bowl's position carries the state, not the water colour. Under reduced motion the bowl jumps and the waves, bubbles and fish stop; the slosh only plays after a toggle. " +
    "The scene never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: ["a calm, playful on/off setting where a water scene suits the product"],
    avoidWhen: [
      "a settings list with many switches — use switch",
      "dense forms, where a 224px switch dominates the row",
    ],
    alternatives: ["switch", "snow-globe-switch", "dot-matrix-switch", "liquid-toggle"],
  },
});
