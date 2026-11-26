import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dot-matrix-switch",
  title: "Dot Matrix Switch",
  description:
    "A switch whose glass orb glides across while drifting embers snap into a glowing dot-matrix sunrise.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["dot-matrix-switch.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, ' +
    "with a focus ring and a hidden input inside forms. The artwork is aria-hidden with no visible label, so " +
    "name it with aria-label or a <label>. The orb's position carries the state, not the glow. Under reduced motion the orb jumps and the dots stop drifting. " +
    "The scene never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: [
      "a showpiece on/off control on a dark interface, such as a focus or daylight mode",
    ],
    avoidWhen: [
      "a settings list with many switches — use switch",
      "dense forms, where a 224px switch dominates the row",
    ],
    alternatives: ["switch", "snow-globe-switch", "tide-switch", "liquid-toggle"],
  },
});
