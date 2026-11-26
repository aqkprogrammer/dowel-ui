import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "eclipse-switch",
  title: "Eclipse Switch",
  description:
    "A switch drawn as a solar eclipse: the moon slides over the sun into totality, the sky darkens and a corona appears.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["eclipse-switch.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, ' +
    "with a focus ring and a hidden input inside forms. The artwork is aria-hidden with no visible label, so " +
    "name it with aria-label or a <label>. " +
    "The moon's position carries the state, not colour. The diamond-ring flash only plays after a toggle; under reduced motion the moon jumps and the stars and corona hold still. " +
    "The scene never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: ["a dark-mode, night or focus toggle where the eclipse is the moment"],
    avoidWhen: [
      "a settings list with many switches — use switch",
      "dense forms, where a 224px switch dominates the row",
    ],
    alternatives: ["switch", "symbiote-switch", "mercury-switch"],
  },
});
