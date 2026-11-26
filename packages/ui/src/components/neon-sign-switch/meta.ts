import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "neon-sign-switch",
  title: "Neon Sign Switch",
  description:
    'A switch drawn as a neon sign: the ring slides across and the tubes stutter alight with a glowing cursive "on".',
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["neon-sign-switch.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, ' +
    "with a focus ring and a hidden input inside forms. The artwork is aria-hidden decoration with no visible " +
    "label, so name it with aria-label or a <label>. The knob's position carries the state, not colour. " +
    "The flicker only plays after a toggle; under reduced motion the sign lights at once and its buzz stops." +
    " The scene never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: [
      "a playful on/off control for a bar, event or night-mode setting, where the switch is the moment",
    ],
    avoidWhen: [
      "a settings list with many switches — use switch",
      "dense forms, where a 224px switch dominates the row",
    ],
    alternatives: ["switch", "reactor-switch", "liquid-toggle"],
  },
});
