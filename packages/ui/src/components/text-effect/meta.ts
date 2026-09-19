import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "text-effect",
  title: "Text Effect",
  description:
    "Text that animates in by character, word or line — blur, rise, mask, spring, centre-out, phrase builds and a wave, as 19 presets.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["text-effect.tsx", "text-effect-presets.ts"],
  a11y:
    "The split pieces are aria-hidden and an sr-only copy carries the whole string, so screen readers read the " +
    "sentence once, not letter by letter; `as` keeps heading semantics. Nothing is announced on its own: pass " +
    "aria-live to announce the settled text when `children` changes, never per piece. The motion is decoration — " +
    "under reduced motion every entrance lands at rest in one frame and the wave stops after one pass, back at rest.",
});
