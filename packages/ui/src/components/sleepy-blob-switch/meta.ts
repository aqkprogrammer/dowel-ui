import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "sleepy-blob-switch",
  title: "Sleepy Blob Switch",
  description:
    "A switch whose knob is a sleepy blob: it wakes, hops across with a squash and a stretch, and smiles as the track warms.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["sleepy-blob-switch.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, ' +
    "with a focus ring and a hidden input inside forms. The artwork is aria-hidden decoration with no visible " +
    "label, so name it with aria-label or a <label>. The knob's position carries the state, not colour. " +
    'The hop only plays after a toggle; under reduced motion the blob jumps and its breathing and drifting "z" stop.' +
    " The scene never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: [
      "a cute on/off control — notifications, a mascot's mood, do-not-disturb — where the switch is the moment",
    ],
    avoidWhen: [
      "a settings list with many switches — use switch",
      "dense forms, where a 224px switch dominates the row",
    ],
    alternatives: ["switch", "origami-switch", "liquid-toggle"],
  },
});
