import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "snow-globe-switch",
  title: "Snow Globe Switch",
  description:
    "A switch drawn as a pixel-art cottage under a glass globe that rolls across the valley as day turns to night.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["snow-globe-switch.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, ' +
    "with a focus ring and a hidden input inside forms. The artwork is aria-hidden with no visible label, so " +
    "name it with aria-label or a <label>. The globe's position carries the state, not the day and night colours. Under reduced motion the globe and the colours change at once, and the stars and snow stop. " +
    "The scene never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: [
      "a playful day/night or light/dark setting where a pixel-art scene suits the product",
    ],
    avoidWhen: [
      "a settings list with many switches — use switch",
      "dense forms, where a 224px switch dominates the row",
    ],
    alternatives: ["switch", "tide-switch", "dot-matrix-switch", "liquid-toggle"],
  },
});
