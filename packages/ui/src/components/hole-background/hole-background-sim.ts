// Original design (pattern inspired by Animate UI Hole Background; no code referenced).

/*
 * The pure half of HoleBackground: the geometry of a tunnel seen in
 * perspective, and the particles that stream down it.
 *
 * Everything is placed by depth `s`, from 1 at the rim (the box's edge) to 0
 * at the vanishing point. At depth s a ring has radius `s × reach` and is
 * centred on a point slid from the vanishing point (s = 0) to the box centre
 * (s = 1), so moving the vanishing point bends the whole tunnel toward it.
 * Rings are spaced by the square of an even step, which crowds them toward
 * the centre the way perspective does, and the step scrolls with time so the
 * rings flow inward forever. Particles fall inward faster as they near the
 * centre and swirl as they go, like matter into a well.
 */

/** A deterministic 0–1 generator (mulberry32). */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export type HoleShape = "tunnel" | "well";

export interface HoleGeometry {
  /** Box centre: where the rim ring is centred. */
  centerX: number;
  centerY: number;
  /** The vanishing point. */
  pointX: number;
  pointY: number;
  /** Rim radius: enough to reach the corners. */
  reach: number;
  /** Vertical squash of every ring: 1 for a tunnel, less for a well seen from above. */
  aspect: number;
}

export interface HoleParticle {
  angle: number;
  /** Depth, 1 at the rim to 0 at the vanishing point. */
  s: number;
  /** Personal speed factor. */
  speed: number;
  size: number;
}

/** The tunnel for a box, with the vanishing point offset by `lean` (each -1–1 of the box). */
export function holeGeometry(
  width: number,
  height: number,
  shape: HoleShape = "well",
  lean: { x: number; y: number } = { x: 0, y: 0 },
): HoleGeometry {
  const clampLean = (value: number) => Math.min(1, Math.max(-1, value));
  return {
    centerX: width / 2,
    centerY: height / 2,
    pointX: width / 2 + clampLean(lean.x) * width * 0.32,
    pointY: height / 2 + clampLean(lean.y) * height * 0.32,
    reach: Math.hypot(width / 2, height / 2) * 1.04,
    aspect: shape === "tunnel" ? 1 : 0.55,
  };
}

/** Centre and radii of the ring at depth `s`. */
export function holeRing(
  geometry: HoleGeometry,
  s: number,
): { x: number; y: number; rx: number; ry: number } {
  const rx = s * geometry.reach;
  return {
    x: geometry.pointX + (geometry.centerX - geometry.pointX) * s,
    y: geometry.pointY + (geometry.centerY - geometry.pointY) * s,
    rx,
    ry: rx * geometry.aspect,
  };
}

/** The point at depth `s` and `angle` on the tunnel wall. */
export function holePoint(
  geometry: HoleGeometry,
  s: number,
  angle: number,
): { x: number; y: number } {
  const ring = holeRing(geometry, s);
  return { x: ring.x + Math.cos(angle) * ring.rx, y: ring.y + Math.sin(angle) * ring.ry };
}

/**
 * Depths and opacities of `count` rings, `offset` (in ring steps) along their
 * inward flow. Rings fade in from the rim and out into the core, so none pops.
 */
export function holeRings(count: number, offset: number): { s: number; alpha: number }[] {
  const rings: { s: number; alpha: number }[] = [];
  if (count <= 0) return rings;
  for (let k = 0; k < count; k += 1) {
    const step = (((k - offset) % count) + count) % count;
    const u = step / count;
    rings.push({ s: u * u, alpha: smoothstep(0, 0.18, u) * (1 - smoothstep(0.82, 1, u)) });
  }
  return rings.sort((a, b) => a.s - b.s);
}

/** Particles for a box at a density (1 ≈ one per 2,500px²), capped at 500. */
export function holeParticleCount(width: number, height: number, density: number): number {
  if (!(width > 0) || !(height > 0) || !(density > 0)) return 0;
  return Math.min(500, Math.round(((width * height) / 2500) * density));
}

/** Scatters `count` particles through the tunnel, weighted toward the rim. */
export function createHoleParticles(count: number, seed = 1): HoleParticle[] {
  const random = seeded(seed);
  return Array.from({ length: count }, () => ({
    angle: random() * Math.PI * 2,
    s: 0.05 + Math.sqrt(random()) * 0.97,
    speed: 0.6 + random() * 0.8,
    size: 0.6 + random() * 1.1,
  }));
}

/**
 * Inward and angular speed of a particle, per second, at `speed` 1: slow at
 * the rim, fast and swirling near the centre.
 */
export function holeParticleVelocity(
  particle: HoleParticle,
  speed = 1,
): { ds: number; dAngle: number } {
  const pace = speed * particle.speed;
  return {
    ds: -pace * (0.06 + 0.42 / (1 + particle.s * 7)),
    dAngle: (pace * 0.22) / (particle.s + 0.14),
  };
}

/** Advances particles by `dt` seconds, in place; one that reaches the core respawns at the rim. */
export function stepHoleParticles(
  particles: HoleParticle[],
  dt: number,
  speed = 1,
  random: () => number = Math.random,
): void {
  if (dt <= 0) return;
  for (const particle of particles) {
    const { ds, dAngle } = holeParticleVelocity(particle, speed);
    particle.s += ds * dt;
    particle.angle = (particle.angle + dAngle * dt) % (Math.PI * 2);
    if (particle.s < 0.025) {
      particle.s = 1 + random() * 0.06;
      particle.angle = random() * Math.PI * 2;
    }
  }
}

/** A particle's opacity: it fades in past the rim and out into the core. */
export function holeParticleAlpha(particle: HoleParticle): number {
  return smoothstep(0.025, 0.14, particle.s) * (1 - smoothstep(0.86, 1.06, particle.s));
}

/** A seeded generator for the component's respawns. */
export function createHoleRandom(seed = 1): () => number {
  return seeded(seed);
}
