import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "bulge-volume",
  title: "Bulge Volume",
  description:
    "A vertical volume pill whose fill rises and falls with a round blob at its top edge that bulges as it moves.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["bulge-volume.tsx"],
  a11y:
    'Built on the Radix slider primitive in vertical orientation: a role="slider" thumb with aria-orientation="vertical", ' +
    "aria-valuenow and a percentage aria-valuetext, moved by Arrow keys, Page Up/Down, Home/End and pointer drag. " +
    'It is named "Volume" unless aria-label or aria-labelledby says otherwise. The focus ring is drawn around the whole pill. ' +
    "The fill, blob and speaker glyph are aria-hidden. Under reduced motion the level jumps and the blob does not squash.",
  guidance: {
    useWhen: [
      "a compact, tactile volume or intensity control in a media player or control centre",
    ],
    avoidWhen: [
      "precise numeric input — use slider or number-field",
      "horizontal layouts — use slider or slosh-slider",
    ],
    alternatives: ["slider", "slosh-slider", "exposure-slider"],
  },
});
