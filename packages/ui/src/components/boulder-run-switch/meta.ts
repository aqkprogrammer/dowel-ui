import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "boulder-run-switch",
  title: "Boulder Run Switch",
  description:
    "A switch drawn as a torch-lit temple: turn it on and a boulder rolls across as the explorer flees with the idol.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["boulder-run-switch.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, ' +
    "with a focus ring and a hidden input inside forms. The scene is aria-hidden decoration with no visible " +
    "label, so name it with aria-label or a <label>. The boulder's position carries the state, not colour. " +
    "The run only plays after a toggle; under reduced motion the boulder jumps and the torch, dust and idol " +
    "stop moving. The scene never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: [
      "a playful on/off setting on a landing page, game or portfolio, where the switch is the moment",
    ],
    avoidWhen: [
      "a settings list with many switches — use switch",
      "dense forms, where a 224px switch dominates the row",
    ],
    alternatives: ["switch", "reactor-switch", "liquid-toggle"],
  },
});
