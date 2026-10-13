// Original design: Dowel's own cosmic mark and loader, as a background.

/*
 * The pure half of CosmicBackground: where the stars are, how they twinkle,
 * and where each orbiting body is at a given moment. No canvas, no DOM, so
 * every rule here is tested directly and the component only draws.
 *
 * The geometry is the docs loader's, scaled up: tilted ellipses about a core,
 * a minor axis about a third of the major, each body riding its own ellipse
 * in its own direction. A body on the near half of its orbit is drawn larger
 * and brighter than on the far half, which is all the depth the eye needs.
 */

export interface CosmicStar {
  /** Position as a fraction of the box, 0–1. */
  x: number;
  y: number;
  /** Radius in CSS pixels. */
  radius: number;
  /** Peak opacity, 0–1. */
  brightness: number;
  /** Twinkle rate, radians per second, and phase. */
  rate: number;
  phase: number;
  /** Which palette entry tints the star; -1 is the star colour. */
  tint: number;
  /** Parallax depth, 0 (far) – 1 (near). */
  depth: number;
}

export interface CosmicOrbit {
  /** Major radius as a fraction of the orbit scale. */
  rx: number;
  /** Minor radius as a fraction of the major. */
  ratio: number;
  /** Tilt in radians. */
  tilt: number;
  /** Seconds per revolution at speed 1. */
  period: number;
  /** +1 counter-clockwise on screen, -1 clockwise. */
  direction: 1 | -1;
  /** Angle the body starts at, radians. */
  start: number;
  /** Body radius in CSS pixels at the near point. */
  body: number;
}

/**
 * The orbits, outermost first. The first two are the loader's own ellipses —
 * the same tilts, the same proportions, the same opposite directions — so the
 * background reads as the mark; the third is a wide, slow outer ring.
 */
export const COSMIC_BACKGROUND_ORBITS: readonly CosmicOrbit[] = [
  {
    rx: 1,
    ratio: 0.33,
    tilt: (-18 * Math.PI) / 180,
    period: 38,
    direction: 1,
    start: 0.6,
    body: 3.2,
  },
  {
    rx: 0.73,
    ratio: 0.34,
    tilt: (34 * Math.PI) / 180,
    period: 52,
    direction: -1,
    start: 3.4,
    body: 2.6,
  },
  {
    rx: 1.32,
    ratio: 0.26,
    tilt: (8 * Math.PI) / 180,
    period: 84,
    direction: 1,
    start: 4.9,
    body: 2.2,
  },
];

/** The most orbits the background draws. */
export const COSMIC_BACKGROUND_MAX_ORBITS = COSMIC_BACKGROUND_ORBITS.length;

/** mulberry32: small, fast, and identical on every JavaScript engine. */
export function createCosmicBackgroundRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** About one star per 2,400 square pixels at density 1, capped so a 4K hero stays cheap. */
export function cosmicBackgroundStarCount(
  width: number,
  height: number,
  density: number,
): number {
  if (width <= 0 || height <= 0 || density <= 0) return 0;
  return Math.min(900, Math.round(((width * height) / 2400) * density));
}

/**
 * A seeded sky. Stars crowd toward the glow at the top — a sky, not wallpaper
 * — and roughly one in four takes a palette colour, so the field carries the
 * same blue-and-orange as the orbiting bodies without competing with them.
 */
export function createCosmicBackgroundStars(
  count: number,
  seed: number,
  paletteSize: number,
): CosmicStar[] {
  const next = createCosmicBackgroundRandom(seed);
  const stars: CosmicStar[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = next();
    const y = next() ** 1.4;
    const size = next() ** 3;
    const roll = next();
    stars.push({
      x,
      y,
      radius: 0.35 + size * 1.25,
      brightness: 0.3 + next() * 0.65,
      rate: 0.6 + next() * 1.8,
      phase: next() * Math.PI * 2,
      tint: paletteSize > 0 && roll > 0.76 ? Math.floor(next() * paletteSize) : -1,
      depth: size,
    });
  }
  return stars;
}

/** A star's opacity at `time`: it breathes between 45% and 100% of its brightness. */
export function cosmicBackgroundTwinkle(star: CosmicStar, time: number): number {
  return star.brightness * (0.725 + 0.275 * Math.sin(star.phase + time * star.rate));
}

/** The angle of an orbit's body after `time` seconds at `speed`. */
export function cosmicBackgroundOrbitAngle(
  orbit: CosmicOrbit,
  time: number,
  speed: number,
): number {
  if (orbit.period <= 0) return orbit.start;
  return orbit.start + (orbit.direction * time * speed * Math.PI * 2) / orbit.period;
}

export interface CosmicPoint {
  x: number;
  y: number;
  /** 0 at the far point of the orbit, 1 at the near point. */
  near: number;
}

/**
 * Where on screen a body at `angle` sits, for an orbit about (`cx`, `cy`)
 * whose major radius is `orbit.rx * scale`. Allocates nothing when `out` is
 * passed, so the frame loop can reuse one point.
 */
export function cosmicBackgroundOrbitPoint(
  orbit: CosmicOrbit,
  angle: number,
  cx: number,
  cy: number,
  scale: number,
  out: CosmicPoint = { x: 0, y: 0, near: 0 },
): CosmicPoint {
  const rx = orbit.rx * scale;
  const ry = rx * orbit.ratio;
  const ex = Math.cos(angle) * rx;
  const ey = Math.sin(angle) * ry;
  const cos = Math.cos(orbit.tilt);
  const sin = Math.sin(orbit.tilt);
  out.x = cx + ex * cos - ey * sin;
  out.y = cy + ex * sin + ey * cos;
  out.near = (Math.sin(angle) + 1) / 2;
  return out;
}

/** Where the core sits, as fractions of the box. */
export const COSMIC_BACKGROUND_ORIGINS = {
  center: { x: 0.5, y: 0.5 },
  top: { x: 0.5, y: 0.22 },
  "top-end": { x: 0.78, y: 0.2 },
  "bottom-start": { x: 0.22, y: 0.8 },
} as const;

export type CosmicBackgroundOrigin = keyof typeof COSMIC_BACKGROUND_ORIGINS;

/**
 * The orbit scale for a box: the outer ring spans about 40% of the narrower
 * side's worth — the loader's proportion — widened on wide boxes so a hero's
 * orbits do not shrink to a dot in the middle.
 */
export function cosmicBackgroundScale(width: number, height: number): number {
  return Math.max(0, Math.min(width * 0.42, height * 0.9, Math.max(width, height) * 0.36));
}
