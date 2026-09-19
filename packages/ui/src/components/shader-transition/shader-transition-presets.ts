// Ported from SmoothUI "Aperture Blur", "Chroma Blur" and "Prism Sweep" transitions (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.

/*
 * The preset table. A preset is data: GLSL defining two functions, and the
 * uniforms the shared program reads.
 *
 *   float field(vec2 uv, vec2 p, float t)          when this pixel is covered, 0 → 1
 *   float sheen(vec2 uv, vec2 p, float t, float d)  secondary-accent tint of the cover;
 *                                                   d is the signed distance to the front
 *
 * `uv` is 0–1 across the frame (x mirrored in RTL), `p` is centred and
 * aspect-corrected (x spans ±aspect/2, y ±1/2), `t` is seconds. Every preset
 * links against one vertex shader and one prelude (hash21, vnoise, fbm, smin,
 * rmax, tri) in shader-transition-engine.ts.
 *
 * Provenance. Only three presets port SmoothUI shader code — aperture-blur,
 * chroma-blur and prism-sweep, SmoothUI's own designs — re-expressed as a field
 * and a sheen, with its literal palette replaced by theme tokens. SmoothUI's
 * other thirteen transitions come from Codrops material, whose licence forbids
 * redistribution: radial-circles, sdf-circle, warped-circle and organic-merge
 * are stages of the Codrops SDF shader progression (SmoothUI's docs say so),
 * sdf-blob is the engine that hosts those stages, and the eight shader-reveal
 * variants are SmoothUI's adaptations of Yuri Artiukh's "Demo 1–8" WebGL image
 * transitions published on Codrops (SmoothUI's changelog calls them the "Akella
 * transitions"). For those thirteen the shaders below are original, written
 * from each effect's description without reading the source shader, and each is
 * marked "original shader (effect inspired by SmoothUI <name>; no code
 * referenced)".
 */

export interface ShaderTransitionPreset {
  /** The SmoothUI component this preset reproduces. */
  source: string;
  /** Whether the shader is ported from SmoothUI or written from scratch. */
  origin: "ported" | "original";
  /** One line for a gallery caption. */
  description: string;
  /** Default run length in ms at `--motion-scale: 1`. */
  duration: number;
  /** Width of the front in field units (0–1). */
  softness: number;
  /** Strength of the primary-accent glow on the front. */
  glow: number;
  /** Strength of the preset's secondary-accent sheen on the cover. */
  sheen: number;
  /** Uncover along the reversed field (the cover retreats) instead of continuing. */
  reverse: boolean;
  /** Defines `field` and `sheen`. */
  glsl: string;
}

/** Max over the frame's four corners of a centred-space shape function. */
const corners = (fn: string) =>
  `vec2 hh = vec2(uRes.x / uRes.y, 1.0) * 0.5; float far = max(max(${fn}(hh), ${fn}(-hh)), max(${fn}(vec2(hh.x, -hh.y)), ${fn}(vec2(-hh.x, hh.y))));`;

export const SHADER_TRANSITION_PRESETS = {
  /* SmoothUI's own designs, ported --------------------------------------- */

  /** Ported: SmoothUI Aperture Blur — a ring opening from the centre, angular ripple, grain. */
  "aperture-blur": {
    source: "ApertureBlurTransition",
    origin: "ported",
    description: "An aperture opens from the centre, its rim rippling and glowing.",
    duration: 900,
    softness: 0.1,
    glow: 1,
    sheen: 0.55,
    reverse: false,
    glsl: `
float field(vec2 uv, vec2 p, float t){
  float a = atan(p.y, p.x);
  float n = sin(a * 8.0 + t * 0.9) * 0.018 + sin(a * 17.0 - t * 0.6) * 0.006;
  return (length(p) - n) / (rmax() + 0.02);
}
float sheen(vec2 uv, vec2 p, float t, float d){
  float swirl = smoothstep(-0.4, 0.4, sin(atan(p.y, p.x) * 2.0 + t * 0.7));
  float grain = hash21(floor(uv * uRes / 3.0) + floor(t * 18.0)) * 0.3;
  return swirl * exp(-d * d * 18.0) + grain * exp(-d * d * 40.0);
}`,
  },

  /** Ported: SmoothUI Chroma Blur — a diagonal curtain with rippling edge and chromatic fringes. */
  "chroma-blur": {
    source: "ChromaBlurTransition",
    origin: "ported",
    description: "A soft diagonal curtain with a rippling edge and chromatic fringes.",
    duration: 1040,
    softness: 0.16,
    glow: 0.45,
    sheen: 0.7,
    reverse: false,
    glsl: `
float field(vec2 uv, vec2 p, float t){
  float n = vnoise(uv * 10.0 + vec2(t * 0.28, -t * 0.18));
  float wave = sin((uv.y + n * 0.12) * 28.0 + t * 2.2) * 0.018;
  return (uv.x * 0.62 + uv.y * 0.38 + wave + 0.02) / 1.04;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  float a = d + 0.045;
  float b = d - 0.045;
  return exp(-a * a * 52.0) + exp(-b * b * 52.0) + vnoise(uv * 34.0 + t * 0.18) * 0.1;
}`,
  },

  /** Ported: SmoothUI Prism Sweep — a faceted glass band sweeping across, caustics behind the crest. */
  "prism-sweep": {
    source: "PrismSweepTransition",
    origin: "ported",
    description: "A faceted prism band sweeps across with caustics behind its crest.",
    duration: 1240,
    softness: 0.08,
    glow: 0.9,
    sheen: 0.9,
    reverse: false,
    glsl: `
float field(vec2 uv, vec2 p, float t){
  float c = t * 0.42;
  float drift = sin(uv.y * 7.0 + c * 1.8) * 0.024 + sin(uv.y * 17.0 - c * 1.1 + 1.6) * 0.010
    + sin((uv.x + uv.y) * 11.0 + c * 0.7) * 0.006;
  return (uv.x + drift * 0.76 + 0.03) / 1.06;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  float c = t * 0.42;
  float facets = smoothstep(0.18, 0.92, tri(uv.y * 12.0 + uv.x * 2.1 + c * 0.35));
  float diagonal = tri((uv.y - uv.x * 0.36) * 5.3 - c * 0.2);
  float caustic = pow(1.0 - diagonal, 4.0) * 0.42 + pow(facets, 2.2) * 0.22;
  float ridge = exp(-(d + 0.05) * (d + 0.05) * 600.0);
  return (caustic + ridge * 0.5) * exp(-d * d * 8.0);
}`,
  },

  /* SDF family: original shaders ----------------------------------------- */

  /** original shader (effect inspired by SmoothUI SdfBlobTransition; no code referenced) */
  "sdf-blob": {
    source: "SdfBlobTransition",
    origin: "original",
    description: "Three soft blobs swell from different points and melt into one.",
    duration: 1120,
    softness: 0.06,
    glow: 0.7,
    sheen: 0.4,
    reverse: false,
    glsl: `
float blobs(vec2 p){
  float a = length(p - vec2(-0.32, 0.18));
  float b = length(p - vec2(0.28, -0.16));
  float c = length(p - vec2(0.06, 0.34));
  return smin(smin(a, b, 0.22), c, 0.22);
}
float field(vec2 uv, vec2 p, float t){
  ${corners("blobs")}
  return (blobs(p) + (fbm(p * 3.0 + t * 0.2) - 0.5) * 0.12) / far;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  return exp(-d * d * 30.0) * fbm(p * 6.0 - t * 0.3);
}`,
  },

  /** original shader (effect inspired by SmoothUI OrganicMergeTransition; no code referenced) */
  "organic-merge": {
    source: "OrganicMergeTransition",
    origin: "original",
    description: "Two organic shapes grow from opposite corners and fuse where they meet.",
    duration: 1120,
    softness: 0.06,
    glow: 0.65,
    sheen: 0.6,
    reverse: false,
    glsl: `
float pair(vec2 p){
  vec2 hh = vec2(uRes.x / uRes.y, 1.0) * 0.5;
  float a = length(p + hh * 0.55);
  float b = length((p - hh * 0.55) * vec2(0.8, 1.25));
  return smin(a, b, 0.3);
}
float field(vec2 uv, vec2 p, float t){
  ${corners("pair")}
  return (pair(p) + (vnoise(p * 4.0 + t * 0.3) - 0.5) * 0.08) / far;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  vec2 hh = vec2(uRes.x / uRes.y, 1.0) * 0.5;
  float seam = abs(length(p + hh * 0.55) - length((p - hh * 0.55) * vec2(0.8, 1.25)));
  return exp(-seam * 8.0) * exp(-d * d * 20.0);
}`,
  },

  /** original shader (effect inspired by SmoothUI SdfCircleTransition; no code referenced) */
  "sdf-circle": {
    source: "SdfCircleTransition",
    origin: "original",
    description: "A clean circle grows from the centre with a crisp edge.",
    duration: 1000,
    softness: 0.025,
    glow: 0.55,
    sheen: 0,
    reverse: false,
    glsl: `
float field(vec2 uv, vec2 p, float t){ return length(p) / rmax(); }
float sheen(vec2 uv, vec2 p, float t, float d){ return 0.0; }`,
  },

  /** original shader (effect inspired by SmoothUI WarpedCircleTransition; no code referenced) */
  "warped-circle": {
    source: "WarpedCircleTransition",
    origin: "original",
    description: "A circle whose perimeter waves as it grows.",
    duration: 1120,
    softness: 0.04,
    glow: 0.7,
    sheen: 0.35,
    reverse: false,
    glsl: `
float field(vec2 uv, vec2 p, float t){
  float a = atan(p.y, p.x);
  float warp = sin(a * 6.0 + t * 1.6) * 0.035 + sin(a * 11.0 - t * 2.1) * 0.015;
  return (length(p) + warp) / (rmax() + 0.05) + 0.02;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  return (0.5 + 0.5 * sin(atan(p.y, p.x) * 6.0 + t * 1.6)) * exp(-d * d * 24.0);
}`,
  },

  /** original shader (effect inspired by SmoothUI RadialCirclesTransition; no code referenced) */
  "radial-circles": {
    source: "RadialCirclesTransition",
    origin: "original",
    description: "A grid of dots swells into circles, radiating out from the centre.",
    duration: 1120,
    softness: 0.03,
    glow: 0.3,
    sheen: 0.5,
    reverse: false,
    glsl: `
float field(vec2 uv, vec2 p, float t){
  float s = 0.11;
  vec2 ctr = (floor(p / s) + 0.5) * s;
  return length(ctr) / rmax() * 0.62 + length(p - ctr) / (s * 0.7072) * 0.38;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  vec2 cell = floor(p / 0.11);
  return step(0.5, fract((cell.x + cell.y) * 0.5)) * exp(-d * d * 25.0);
}`,
  },

  /* Shader-reveal family: original shaders ------------------------------- */

  /** original shader (effect inspired by SmoothUI ShaderRevealNoiseTransition; no code referenced) */
  noise: {
    source: "ShaderRevealNoiseTransition",
    origin: "original",
    description: "A turbulent noise threshold: the cover arrives in organic patches.",
    duration: 1080,
    softness: 0.08,
    glow: 0.55,
    sheen: 0.45,
    reverse: false,
    glsl: `
float field(vec2 uv, vec2 p, float t){
  return (fbm(p * 3.2 + vec2(t * 0.12, -t * 0.08)) - 0.22) / 0.56;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  return fbm(p * 9.0 + t * 0.4) * exp(-d * d * 30.0);
}`,
  },

  /** original shader (effect inspired by SmoothUI ShaderRevealZoomTransition; no code referenced) */
  zoom: {
    source: "ShaderRevealZoomTransition",
    origin: "original",
    description: "A lens swells from the centre, then the frame zooms back through it.",
    duration: 1080,
    softness: 0.07,
    glow: 0.6,
    sheen: 0.5,
    reverse: true,
    glsl: `
float lens(vec2 p){ return length((p - vec2(0.0, -0.08)) * vec2(1.0, 1.25)); }
float field(vec2 uv, vec2 p, float t){
  ${corners("lens")}
  return lens(p) / far;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  return (0.5 + 0.5 * sin(length(p) * 48.0 - t * 3.0)) * exp(-d * d * 14.0);
}`,
  },

  /** original shader (effect inspired by SmoothUI ShaderRevealCircleTransition; no code referenced) */
  circle: {
    source: "ShaderRevealCircleTransition",
    origin: "original",
    description: "A circle with a noisy, smoky rim spreads from the centre.",
    duration: 1080,
    softness: 0.09,
    glow: 0.6,
    sheen: 0.4,
    reverse: false,
    glsl: `
float field(vec2 uv, vec2 p, float t){
  return (length(p) + (fbm(p * 4.0 + t * 0.25) - 0.5) * 0.22) / (rmax() + 0.06) + 0.03;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  return fbm(p * 7.0 - t * 0.3) * exp(-d * d * 22.0);
}`,
  },

  /** original shader (effect inspired by SmoothUI ShaderRevealWipeTransition; no code referenced) */
  wipe: {
    source: "ShaderRevealWipeTransition",
    origin: "original",
    description: "A narrow, noise-displaced blade wipes across toward the inline end.",
    duration: 1000,
    softness: 0.025,
    glow: 1,
    sheen: 0.3,
    reverse: false,
    glsl: `
float field(vec2 uv, vec2 p, float t){
  return uv.x * 0.9 + (fbm(vec2(uv.y * 6.0, t * 0.35)) - 0.5) * 0.1 + 0.05;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  return vnoise(vec2(uv.y * 40.0, t)) * exp(-d * d * 60.0);
}`,
  },

  /** original shader (effect inspired by SmoothUI ShaderRevealLumaTransition; no code referenced) */
  luma: {
    source: "ShaderRevealLumaTransition",
    origin: "original",
    description: "Horizontal ribbons pour down from the top, each on its own delay.",
    duration: 1080,
    softness: 0.05,
    glow: 0.4,
    sheen: 0.45,
    reverse: false,
    glsl: `
float field(vec2 uv, vec2 p, float t){
  float row = floor(uv.y * 12.0);
  return hash21(vec2(row, 7.0)) * 0.4 + (1.0 - uv.y) * 0.35 + (1.0 - fract(uv.y * 12.0)) * 0.25;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  return mod(floor(uv.y * 12.0), 2.0) * exp(-d * d * 12.0);
}`,
  },

  /** original shader (effect inspired by SmoothUI ShaderRevealPlanetaryTransition; no code referenced) */
  planetary: {
    source: "ShaderRevealPlanetaryTransition",
    origin: "original",
    description: "Spiral arms wind outward from the centre like a vortex.",
    duration: 1180,
    softness: 0.06,
    glow: 0.6,
    sheen: 0.5,
    reverse: false,
    glsl: `
float field(vec2 uv, vec2 p, float t){
  float r = length(p) / rmax();
  float arm = fract((atan(p.y, p.x) / TAU + 0.5) * 2.0 + r * 1.1 - t * 0.04);
  return r * 0.55 + arm * 0.45;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  return (0.5 + 0.5 * sin(atan(p.y, p.x) * 4.0 + length(p) * 18.0 - t * 2.0)) * exp(-d * d * 18.0);
}`,
  },

  /** original shader (effect inspired by SmoothUI ShaderRevealStripesTransition; no code referenced) */
  stripes: {
    source: "ShaderRevealStripesTransition",
    origin: "original",
    description: "Slanted bars of random width snap shut like a barcode shutter.",
    duration: 1000,
    softness: 0.015,
    glow: 0.35,
    sheen: 0.4,
    reverse: false,
    glsl: `
float field(vec2 uv, vec2 p, float t){
  float s = (uv.x + uv.y * 0.35) / 1.35;
  return s * 0.55 + hash21(vec2(floor(s * 26.0), 3.1)) * 0.45;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  float s = (uv.x + uv.y * 0.35) / 1.35;
  return step(0.5, hash21(vec2(floor(s * 26.0), 9.7))) * exp(-d * d * 40.0);
}`,
  },

  /** original shader (effect inspired by SmoothUI ShaderRevealPushTransition; no code referenced) */
  push: {
    source: "ShaderRevealPushTransition",
    origin: "original",
    description: "A noisy front pushes up from the bottom, pulled along by flowing noise.",
    duration: 1080,
    softness: 0.07,
    glow: 0.55,
    sheen: 0.45,
    reverse: false,
    glsl: `
float field(vec2 uv, vec2 p, float t){
  float n = fbm(vec2(uv.x * 3.0, uv.y * 2.0 - t * 0.5));
  return uv.y * 0.8 + (n - 0.5) * 0.36 + 0.1;
}
float sheen(vec2 uv, vec2 p, float t, float d){
  return fbm(vec2(uv.x * 8.0, uv.y * 4.0 - t * 0.8)) * exp(-d * d * 20.0);
}`,
  },
} satisfies Record<string, ShaderTransitionPreset>;

export type ShaderTransitionPresetName = keyof typeof SHADER_TRANSITION_PRESETS;

export const SHADER_TRANSITION_PRESET_NAMES = Object.keys(
  SHADER_TRANSITION_PRESETS,
) as ShaderTransitionPresetName[];

/** The preset for a name; unknown names fall back to `noise` (and warn in development). */
export function getShaderTransitionPreset(name: string): ShaderTransitionPreset {
  const table: Record<string, ShaderTransitionPreset> = SHADER_TRANSITION_PRESETS;
  const preset = table[name];
  if (preset) return preset;
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[ShaderTransition] unknown preset "${name}"; using "noise".`);
  }
  return SHADER_TRANSITION_PRESETS.noise;
}
