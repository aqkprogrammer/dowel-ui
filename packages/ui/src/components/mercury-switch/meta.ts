import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "mercury-switch",
  title: "Mercury Switch",
  description:
    "A switch whose knob is a bead of liquid metal that pours across a gunmetal well, stretching into a dumbbell, and glows blue when on.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["mercury-switch.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, ' +
    "with a focus ring and a hidden input inside forms. The artwork is aria-hidden with no visible label, so " +
    "name it with aria-label or a <label>. " +
    "The bead's position carries the state; the blue glow only reinforces it. The wobble only plays after a toggle; under reduced motion the bead jumps and the glow holds still. " +
    "The scene never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: ["a premium on/off control — a dark dashboard, a hardware or audio product page"],
    avoidWhen: [
      "a settings list with many switches — use switch",
      "dense forms, where a 224px switch dominates the row",
    ],
    alternatives: ["switch", "symbiote-switch", "eclipse-switch"],
  },
});
