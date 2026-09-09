/**
 * Tuning for the Astra star field.
 *
 * Every number the scene reads lives here, so the shaders, the field generator
 * and the animation loop never carry a literal that someone would later have
 * to hunt for. The values are the ones the effect was designed around; the
 * clamps in the code that reads them say what range each survives.
 */

export interface AstraStarsConfig {
  /** Stars per arm, as a multiple of the base count. */
  density: number;
  /** How strongly stars bunch towards the middle of an arm (0–0.98). */
  densityFalloff: number;
  /** Whether the arms flow towards the core or away from it. */
  flowInward: boolean;
  flowSpeed: number;
  intensity: number;
  /** How far a star may sit off its arm, in world units. */
  scatter: number;
  size: number;
  /** How much smaller stars get towards an arm's ends (0–1). */
  sizeFalloff: number;
  twinkleSpeed: number;
}

export interface AstraInteractionConfig {
  /** Whether the pointer pushes stars aside as it moves. */
  particleRepel: boolean;
  /** Radius of the pointer's influence, in CSS pixels. */
  repelRadius: number;
  /** How far behind the outer arms lag the inner ones when dragged (0–1). */
  rotationLag: number;
}

export interface AstraLensFlareConfig {
  enabled: boolean;
  ghosts: number;
  halo: number;
  intensity: number;
  /** Strength of the flares on the brightest star of each arm. */
  secondary: number;
  streakLength: number;
  streaks: number;
  verticalStreaks: number;
}

export interface AstraDirtyGlassConfig {
  enabled: boolean;
  distortion: number;
  drift: boolean;
  driftStrength: number;
  grain: number;
}

export interface AstraConfig {
  animationPlaying: boolean;
  bloomIntensity: number;
  bloomThreshold: number;
  /** Seconds the opening convergence takes. */
  convergeDuration: number;
  /** Whether a dragged field turns back to face forward when released. */
  faceForward: boolean;
  interactionMode: "rotate" | "none";
  pathShapeAutoRotate: boolean;
  pathShapeAutoRotateAmount: number;
  pathShapeScatter: number;
  /** Depth of the arms' out-of-plane wobble (0–2). */
  rotationDepth: number;
  /** Scroll distance, in CSS pixels, over which the field disperses. */
  scrollDisperseDistance: number;
  scrollEffects: boolean;
  scrollStarDriftSpeed: number;
  scrollStartOffset: number;
  /** Scroll distance over which the hero labels fade. */
  scrollTextFadeDistance: number;
  showCenterCluster: boolean;
  /** Five colours: cool, cool, warm, warm, white — in that order. */
  colors: readonly [string, string, string, string, string];
  stars: AstraStarsConfig;
  interaction: AstraInteractionConfig;
  lensFlare: AstraLensFlareConfig;
  dirtyGlass: AstraDirtyGlassConfig;
}

export const ASTRA_PALETTES = {
  astra: ["#6DCBF4", "#7AB1FE", "#F87915", "#FA994C", "#F5F6FB"],
  aurora: ["#47E2C2", "#6DCBF4", "#B06DFF", "#E96AC8", "#F5F6FB"],
  ember: ["#F7CB59", "#FA994C", "#F67576", "#B06DFF", "#F5F6FB"],
} as const satisfies Record<string, AstraConfig["colors"]>;

export const DEFAULT_ASTRA_CONFIG: AstraConfig = Object.freeze({
  animationPlaying: true,
  bloomIntensity: 0.7,
  bloomThreshold: 0.08,
  convergeDuration: 5.5,
  faceForward: true,
  interactionMode: "rotate",
  pathShapeAutoRotate: true,
  pathShapeAutoRotateAmount: 0.42,
  pathShapeScatter: 1,
  rotationDepth: 1.4,
  scrollDisperseDistance: 800,
  scrollEffects: true,
  scrollStarDriftSpeed: 3,
  scrollStartOffset: 0,
  scrollTextFadeDistance: 200,
  showCenterCluster: true,
  colors: ASTRA_PALETTES.astra,
  stars: {
    density: 4,
    densityFalloff: 0.22,
    flowInward: true,
    flowSpeed: 0.8,
    intensity: 1.35,
    scatter: 0.4,
    size: 2.05,
    sizeFalloff: 0.45,
    twinkleSpeed: 0.62,
  },
  interaction: {
    particleRepel: true,
    repelRadius: 176,
    rotationLag: 0.68,
  },
  lensFlare: {
    enabled: true,
    ghosts: 0.1,
    halo: 0.12,
    intensity: 0.28,
    secondary: 0.55,
    streakLength: 0.03485,
    streaks: 0.18,
    verticalStreaks: 1,
  },
  dirtyGlass: {
    enabled: true,
    distortion: 0.68,
    drift: true,
    driftStrength: 0.28,
    grain: 0.031,
  },
});

/** Seconds a pushed star keeps coasting before the simulation stops. */
export const PARTICLE_MOTION_SETTLE_SECONDS = 6;

/** Dispersed-field drift, shared by the shader and the flare tracking. */
export const AMBIENT_DRIFT_MIN = 0.035;
export const AMBIENT_DRIFT_MAX = 0.12;
export const AMBIENT_SPEED_MIN = 0.4;
export const AMBIENT_SPEED_MAX = 0.8;
export const PARALLAX_MIN = 0.08;
export const PARALLAX_MAX = 0.28;

/** Progress at which a revealed star reaches full opacity. */
export const PARTICLE_OPACITY_REVEAL_END = 0.2;

/** Wobble of each arm, and how it moves. Three strong arms, two faint ones. */
export const ASTRA_ARMS = [
  { depth: 0.62, phase: 0.16, speed: 0.025, strong: true },
  { depth: -0.46, phase: 0.72, speed: -0.018, strong: false },
  { depth: 0.78, phase: 0.38, speed: 0.021, strong: true },
  { depth: -0.7, phase: 0.58, speed: -0.016, strong: false },
  { depth: 0.42, phase: 0.08, speed: 0.03, strong: true },
] as const;

/** Colour seed of the tracked hero star per arm, so each arm's flare differs. */
export const SECONDARY_COLOR_SEEDS = [0.08, 0.58, 0.22, 0.68, 0.44] as const;
