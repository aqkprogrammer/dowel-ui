/**
 * What this device can be asked to draw.
 *
 * The field is fixed, but how much of the pipeline runs on it is not: a phone
 * gets the stars without the post-processing that makes them glow, a laptop
 * on battery gets the glow without the lens, and a desktop gets everything.
 * Guessing wrong in either direction is visible — dropped frames one way, a
 * flat picture the other — so the tiers lean on what the browser will say
 * for certain (WebGL2, hover, core count) and stay conservative otherwise.
 */

export type Postprocessing = "none" | "selective" | "full";

export interface RendererProfile {
  available: boolean;
  /** 0 = no WebGL2, 1 = low end, 2 = capable, 3 = desktop class. */
  tier: 0 | 1 | 2 | 3;
  antialias: boolean;
  maxParticleCount: number;
  /** Whether to keep drawing every frame, or only when something changes. */
  continuousMotion: boolean;
  postprocessing: Postprocessing;
  multisampling: number;
  bloomLevels: number;
  bloomResolutionScale: number;
  optics: { secondarySourceCount: number; distortion: boolean } | null;
}

function canUseWebGL2(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function detectRendererProfile(): RendererProfile {
  if (!canUseWebGL2()) {
    return {
      available: false,
      tier: 0,
      antialias: false,
      maxParticleCount: 0,
      continuousMotion: false,
      postprocessing: "none",
      multisampling: 0,
      bloomLevels: 0,
      bloomResolutionScale: 0,
      optics: null,
    };
  }
  const hover = window.matchMedia("(any-hover: hover)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const tier: 1 | 2 | 3 = cores <= 4 || memory <= 2 ? 1 : hover && cores >= 8 ? 3 : 2;
  const postprocessing: Postprocessing =
    tier === 3 ? "full" : tier === 2 ? "selective" : "none";
  const full = postprocessing === "full";
  return {
    available: true,
    tier,
    antialias: tier >= 2,
    maxParticleCount: tier === 1 ? 2600 : Infinity,
    continuousMotion: tier >= 2,
    postprocessing,
    multisampling: postprocessing !== "none" && tier >= 2 ? 2 : 0,
    bloomLevels: full ? 5 : postprocessing === "selective" ? 3 : 0,
    bloomResolutionScale: postprocessing === "none" ? 0 : 0.5,
    optics: full ? { secondarySourceCount: 5, distortion: true } : null,
  };
}

/**
 * The device pixel ratio the scene renders at: capped at 1.5, and lowered
 * further on large canvases so the fragment budget stays near 2.4 megapixels.
 */
export function computePixelRatio(
  devicePixelRatio: number,
  width?: number,
  height?: number,
): number {
  let ratio = Number.isFinite(devicePixelRatio)
    ? Math.min(1.5, Math.max(0.1, devicePixelRatio))
    : 1;
  if (
    width &&
    height &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    ratio = Math.min(ratio, Math.max(0.5, Math.sqrt(2.4e6 / (width * height))));
  }
  return Math.max(0.1, Math.floor(100 * ratio) / 100);
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
