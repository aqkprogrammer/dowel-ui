import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "shader-background",
  title: "Shader Background",
  description:
    "A full-bleed WebGL scene behind content — fourteen procedural presets (dunes, hills, storm sea, meadow, petals, glass wave, liquid metal, silk, mesh gradient, topography, particle ocean, nebula, warp, helix) on one engine, behind a section or pinned behind a whole page, paused off-screen.",
  category: "effects",
  status: "experimental",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: [
    "shader-background.tsx",
    "shader-background-engine.ts",
    "shader-background-presets.ts",
  ],
  a11y:
    "Pure decoration: the scene is aria-hidden and takes no pointer events, and children render above it in " +
    "their own layer, keeping their roles, focus order and hit areas. Nothing is drawn while it is off-screen " +
    "or the tab is hidden. Under reduced motion (OS setting or --motion-scale 0) each preset draws one chosen " +
    "frame and stops; in forced-colours mode the scene is removed. Many presets are photographic in contrast — " +
    "set text on a surface, or lower the palette's contrast, where the scene is busy behind it.",
  guidance: {
    useWhen: [
      "a landing hero or full-page backdrop that needs a scene rather than a gradient",
      "a marketing section with one strong visual mood (desert, ocean, space, glass)",
    ],
    avoidWhen: [
      "behind long reading text — use a flat surface",
      "more than a handful on one page — each is a WebGL context, and browsers cap them",
      "a quiet tint — use gradient-background or aurora-background",
    ],
    alternatives: ["aurora-background", "gradient-background", "cosmic-background"],
  },
  composesWith: ["text-effect", "shimmer-text", "border-beam"],
});
