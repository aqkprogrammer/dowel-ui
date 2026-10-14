import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "color-picker",
  title: "Color Picker",
  description:
    "Pick a colour from a saturation square, hue and alpha sliders, a hex/rgb/oklch field, swatches or the screen — with a live WCAG contrast reading.",
  category: "form",
  status: "beta",
  dependencies: [],
  registryDependencies: ["input", "slider"],
  files: ["color-picker.tsx", "color-picker-math.ts"],
  a11y:
    "Every part works by keyboard. The square is a slider named for saturation and brightness: left and right " +
    "change saturation, up and down brightness, Shift for steps of ten, Home and End for none and full; its value " +
    "text speaks both. Hue and opacity are standard sliders with spoken values in degrees and percent. The text " +
    "field takes hex, rgb() or oklch(), marks itself invalid with a message when it cannot read a value, and " +
    "Escape restores the last good one. Swatches are toggle buttons named by their colour. The contrast reading " +
    "gives the ratio and the WCAG level in words, never colour alone.",
  guidance: {
    useWhen: [
      "choosing a brand or accent colour in settings or a theme editor",
      "any colour input where contrast against a background matters",
    ],
    avoidWhen: [
      "choosing from a small fixed set — use toggle-group or radio-group with swatches",
      "generating whole palettes — use palette-generator",
    ],
    alternatives: ["palette-generator", "theme-toggle"],
  },
  composesWith: ["popover", "form"],
  controls: {
    contrastWith: { kind: "color" },
    value: { hidden: true },
  },
});
