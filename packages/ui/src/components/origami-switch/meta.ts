import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "origami-switch",
  title: "Origami Switch",
  description:
    "A switch folded from paper: the star on its knob unfolds as it slides and the creased panels flip one after another.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["origami-switch.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, ' +
    "with a focus ring and a hidden input inside forms. The artwork is aria-hidden decoration with no visible " +
    "label, so name it with aria-label or a <label>. The knob's position carries the state, not colour. " +
    "The panel flip only plays after a toggle; under reduced motion the knob and star jump and the panels change shade without flipping." +
    " The scene never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: [
      "a gentle, crafted on/off control on a playful or editorial page, where the switch is the moment",
    ],
    avoidWhen: [
      "a settings list with many switches — use switch",
      "dense forms, where a 224px switch dominates the row",
    ],
    alternatives: ["switch", "sleepy-blob-switch", "liquid-toggle"],
  },
});
