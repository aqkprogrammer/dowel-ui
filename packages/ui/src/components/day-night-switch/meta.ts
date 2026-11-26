import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "day-night-switch",
  title: "Day Night Switch",
  description:
    "A theme switch whose thumb squashes and stretches across the track while its sun morphs into a moon.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["day-night-switch.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, with a ' +
    "hidden input inside forms and a visible focus ring. The sun and moon are aria-hidden and there is no visible " +
    'label, so name it with aria-label ("Dark mode") or a <label>. The thumb\'s position carries the state as well ' +
    "as the glyph and the track colour. It travels toward the inline end, mirrored in right-to-left layouts. Under " +
    "reduced motion the state changes without the squash or the morph.",
  guidance: {
    useWhen: [
      "a light/dark theme switch that deserves a little character, in a header or settings panel",
    ],
    avoidWhen: [
      "a compact icon button in a toolbar — use theme-toggle",
      "an ordinary on/off setting that is not about day and night — use switch",
    ],
    alternatives: ["theme-toggle", "switch", "eclipse-switch"],
  },
});
