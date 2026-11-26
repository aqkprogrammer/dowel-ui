import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "symbiote-switch",
  title: "Symbiote Switch",
  description:
    "A switch whose knob is a drop of black goo on white porcelain that stretches as it crosses and drips when it lands.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["symbiote-switch.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, ' +
    "with a focus ring and a hidden input inside forms. The artwork is aria-hidden with no visible label, so " +
    "name it with aria-label or a <label>. " +
    "The goo's position carries the state, not colour. The squash only plays after a toggle; under reduced motion the drop jumps and the rim stops shimmering. " +
    "The scene never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: ["a playful on/off setting where a gooey, tactile knob suits the product"],
    avoidWhen: [
      "a settings list with many switches — use switch",
      "dense forms, where a 224px switch dominates the row",
    ],
    alternatives: ["switch", "mercury-switch", "eclipse-switch"],
  },
});
