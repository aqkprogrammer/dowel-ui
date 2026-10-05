// Original design (pattern inspired by Animate UI Gravity Stars Background; no code referenced).

/*
 * The pure half of GravityStarsBackground: drifting particles, a pointer that
 * acts as a gravity well, and click shockwaves.
 *
 * - Drift: every particle has a resting velocity it relaxes back to, so a
 *   field left alone wanders calmly, and a flung particle coasts and slows.
 * - The well: inside `radius` of the pointer a particle is pulled in with a
 *   force that grows toward the centre, plus a sideways share of it (`swirl`)
 *   that turns the fall into an orbit, and a little drag so orbits tighten
 *   instead of flying apart. Releasing the well (the pointer leaving) throws
 *   every captured particle outward along its orbit.
 * - Shockwaves: a ring expands from a click; a particle is kicked outward once,
 *   at the moment the ring's front passes it, harder while the ring is young.
 * - Heat: 0–1 from speed, eased so it glows up and cools down smoothly. The
 *   component draws a trail and glow from it.
 *
 * Everything is in CSS pixels and seconds, randomness is seeded, and nothing
 * here touches the DOM, so tests drive it frame by frame.
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

export const GRAVITY_STARS = {
  /** Reach of the pointer's pull in CSS pixels. */
  radius: 220,
  /** Peak pull in px/s², at the centre of the well. */
  pull: 2600,
  /** Sideways share of the pull, which turns a fall into an orbit. */
  swirl: 0.35,
  /** Drag inside the well, per second. */
  drag: 1.1,
  /** How quickly a free particle relaxes back to its drift, per second. */
  relax: 0.85,
  /** Softening radius: the pull fades to nothing at the very centre. */
  core: 18,
  maxSpeed: 1400,
  /** Outward speed multiplier for captured particles when the well lets go. */
  fling: 1.5,
  /** Shockwave front speed (px/s), lifetime (s) and peak kick (px/s). */
  waveSpeed: 720,
  waveLife: 0.85,
  waveKick: 620,
  /** Margin past the edge before a particle wraps to the other side. */
  margin: 12,
} as const;

export interface GravityStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** The velocity the particle drifts at when nothing acts on it. */
  driftX: number;
  driftY: number;
  radius: number;
  /** Twinkle phase in radians. */
  phase: number;
  /** 0–1 glow from speed, eased. */
  heat: number;
}

export interface GravityStarsWave {
  x: number;
  y: number;
  age: number;
}

export interface GravityStarsWorld {
  width: number;
  height: number;
  stars: GravityStar[];
  waves: GravityStarsWave[];
  /** The well, in CSS pixels, or null when the pointer is away. */
  pointer: { x: number; y: number } | null;
}

/** Particles for a box at a density (1 ≈ one per 5,000px²), capped at 320. */
export function gravityStarsCount(width: number, height: number, density: number): number {
  if (!(width > 0) || !(height > 0) || !(density > 0)) return 0;
  return Math.min(320, Math.round(((width * height) / 5000) * density));
}

/** A world of `count` particles scattered over the box, each with its own drift. */
export function createGravityStarsWorld(
  width: number,
  height: number,
  count: number,
  seed = 1,
): GravityStarsWorld {
  const random = seeded(seed);
  const stars: GravityStar[] = [];
  for (let i = 0; i < count; i += 1) {
    const heading = random() * Math.PI * 2;
    const speed = 6 + random() * 16;
    const driftX = Math.cos(heading) * speed;
    const driftY = Math.sin(heading) * speed;
    stars.push({
      x: random() * width,
      y: random() * height,
      vx: driftX,
      vy: driftY,
      driftX,
      driftY,
      radius: 0.7 + random() ** 2 * 1.5,
      phase: random() * Math.PI * 2,
      heat: 0,
    });
  }
  return { width, height, stars, waves: [], pointer: null };
}

/** Rescales particle positions to a new box, so a resize keeps the field's shape. */
export function resizeGravityStarsWorld(
  world: GravityStarsWorld,
  width: number,
  height: number,
): void {
  if (world.width > 0 && world.height > 0) {
    const sx = width / world.width;
    const sy = height / world.height;
    for (const star of world.stars) {
      star.x *= sx;
      star.y *= sy;
    }
  }
  world.width = width;
  world.height = height;
}

/** Moves the well, or removes it (null) — which flings every captured particle outward. */
export function setGravityStarsPointer(
  world: GravityStarsWorld,
  pointer: { x: number; y: number } | null,
): void {
  const previous = world.pointer;
  world.pointer = pointer;
  if (pointer || !previous) return;
  for (const star of world.stars) {
    const dx = star.x - previous.x;
    const dy = star.y - previous.y;
    const distance = Math.hypot(dx, dy);
    if (distance >= GRAVITY_STARS.radius || distance === 0) continue;
    const out = (1 - distance / GRAVITY_STARS.radius) * 160;
    star.vx = star.vx * GRAVITY_STARS.fling + (dx / distance) * out;
    star.vy = star.vy * GRAVITY_STARS.fling + (dy / distance) * out;
  }
}

/** Sends a shockwave out from a point. */
export function addGravityStarsWave(world: GravityStarsWorld, x: number, y: number): void {
  world.waves.push({ x, y, age: 0 });
  if (world.waves.length > 6) world.waves.shift();
}

function wrap(value: number, size: number, margin: number): number {
  if (value < -margin) return value + size + margin * 2;
  if (value > size + margin) return value - size - margin * 2;
  return value;
}

/** Advances the world by `dt` seconds, in place. */
export function stepGravityStars(world: GravityStarsWorld, dt: number): void {
  if (dt <= 0) return;
  const { radius, pull, swirl, drag, relax, core, maxSpeed, margin } = GRAVITY_STARS;
  const { waveSpeed, waveLife, waveKick } = GRAVITY_STARS;
  const relaxBy = 1 - Math.exp(-relax * dt);
  const dragBy = Math.exp(-drag * dt);
  const heatBy = Math.min(1, dt * 6);
  const { pointer } = world;

  for (const star of world.stars) {
    let captured = false;
    if (pointer) {
      const dx = pointer.x - star.x;
      const dy = pointer.y - star.y;
      const distance = Math.hypot(dx, dy);
      if (distance < radius && distance > 0) {
        captured = true;
        const falloff = (1 - distance / radius) ** 1.5;
        const soften = distance / (distance + core);
        const force = pull * falloff * soften;
        const nx = dx / distance;
        const ny = dy / distance;
        // Toward the well, plus a turn to the side so the fall becomes an orbit.
        star.vx += (nx - ny * swirl) * force * dt;
        star.vy += (ny + nx * swirl) * force * dt;
        star.vx *= dragBy;
        star.vy *= dragBy;
      }
    }
    if (!captured) {
      star.vx += (star.driftX - star.vx) * relaxBy;
      star.vy += (star.driftY - star.vy) * relaxBy;
    }
  }

  for (const wave of world.waves) {
    const inner = wave.age * waveSpeed;
    wave.age += dt;
    const outer = wave.age * waveSpeed;
    const strength = waveKick * Math.max(0, 1 - wave.age / waveLife);
    for (const star of world.stars) {
      const dx = star.x - wave.x;
      const dy = star.y - wave.y;
      const distance = Math.hypot(dx, dy);
      if (distance < inner || distance >= outer) continue;
      const nx = distance > 0 ? dx / distance : 1;
      const ny = distance > 0 ? dy / distance : 0;
      star.vx += nx * strength;
      star.vy += ny * strength;
    }
  }
  world.waves = world.waves.filter((wave) => wave.age < waveLife);

  for (const star of world.stars) {
    const speed = Math.hypot(star.vx, star.vy);
    if (speed > maxSpeed) {
      star.vx *= maxSpeed / speed;
      star.vy *= maxSpeed / speed;
    }
    star.x = wrap(star.x + star.vx * dt, world.width, margin);
    star.y = wrap(star.y + star.vy * dt, world.height, margin);
    const target = Math.min(1, Math.max(0, (Math.min(speed, maxSpeed) - 70) / 380));
    star.heat += (target - star.heat) * heatBy;
  }
}

/**
 * Pairs of particles close enough to be joined by a faint line, with a 0–1
 * strength that fades to nothing at `distance`.
 */
export function gravityStarsLinks(
  stars: readonly GravityStar[],
  distance: number,
): [number, number, number][] {
  const links: [number, number, number][] = [];
  const limit = distance * distance;
  for (let i = 0; i < stars.length; i += 1) {
    const a = stars[i];
    if (!a) continue;
    for (let j = i + 1; j < stars.length; j += 1) {
      const b = stars[j];
      if (!b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const squared = dx * dx + dy * dy;
      if (squared < limit) links.push([i, j, 1 - Math.sqrt(squared) / distance]);
    }
  }
  return links;
}
