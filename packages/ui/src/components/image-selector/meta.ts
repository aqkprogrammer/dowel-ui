import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "image-selector",
  title: "Image Selector",
  description:
    "A photo grid with a Select mode: tick photos, see the count, share or delete them, and reset.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: ["button"],
  files: ["image-selector.tsx"],
  a11y:
    "The grid is a list named by `label`. In Select mode each photo is a native checkbox named by the image's alt " +
    "text — Tab reaches each, Space ticks it — with a visible focus ring on the photo. The Select toggle exposes " +
    "aria-pressed; the selection count is a polite live region. Share and Delete are named icon buttons that " +
    "become aria-disabled (not disabled) with nothing selected, so focus stays put after a delete. Tick marks are " +
    'aria-hidden. The reflow after a delete uses motion inside MotionConfig reducedMotion="user"; the rest is CSS ' +
    "and stops under reduced motion.",
});
