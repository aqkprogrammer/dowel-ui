// Original design.

/*
 * The pure half of FlowField: a smooth vector field that changes slowly over
 * time, and particles carried along it. Particles live in one Float32Array —
 * x, y and remaining life per particle — moved in place, so the frame loop
 * allocates nothing.
 */

/** Values per particle in the state array: x, y, life. */
export const FLOW_STRIDE = 3;

/** The most particles the field draws, however large the box. */
export const FLOW_FIELD_MAX_PARTICLES = 1400;

/** About one particle per 1,100 square pixels at density 1, capped. */
export function flowFieldParticleCount(width: number, height: number, density: number): number {
  if (width <= 0 || height <= 0 || density <= 0) return 0;
  return Math.min(FLOW_FIELD_MAX_PARTICLES, Math.round(((width * height) / 1100) * density));
}

/**
 * The field's direction at (`x`, `y`) at `time`, in radians: three crossed
 * sine waves, which is smooth everywhere, has no seams, and costs a handful of
 * multiplications. `scale` stretches it — larger means broader currents.
 */
export function flowAngle(x: number, y: number, time: number, scale: number): number {
  const f = 0.0042 / Math.max(0.1, scale);
  return (
    (Math.sin(x * f + time * 0.31) +
      Math.cos(y * f * 1.27 - time * 0.23) +
      Math.sin((x + y) * f * 0.71 + time * 0.11)) *
    Math.PI *
    0.62
  );
}

/** mulberry32: small, fast, and the same on every JavaScript engine. */
export function createFlowRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Places particle `index` somewhere new, with a fresh life of 2–6 seconds. */
export function respawnParticle(
  state: Float32Array,
  index: number,
  width: number,
  height: number,
  random: () => number,
): void {
  const at = index * FLOW_STRIDE;
  state[at] = random() * width;
  state[at + 1] = random() * height;
  state[at + 2] = 2 + random() * 4;
}

export interface FlowStep {
  width: number;
  height: number;
  time: number;
  delta: number;
  /** Pixels per second along the field at speed 1. */
  speed: number;
  scale: number;
  /** Pushes particles away within `pushRadius` of it. */
  pointer: { x: number; y: number } | null;
  pushRadius: number;
}

/**
 * Moves every particle along the field for one frame, in place, respawning
 * any that leave the box or run out of life.
 */
export function stepFlowField(
  state: Float32Array,
  count: number,
  random: () => number,
  { width, height, time, delta, speed, scale, pointer, pushRadius }: FlowStep,
): void {
  for (let i = 0; i < count; i += 1) {
    const at = i * FLOW_STRIDE;
    let x = state[at] ?? 0;
    let y = state[at + 1] ?? 0;
    const angle = flowAngle(x, y, time, scale);
    x += Math.cos(angle) * speed * delta;
    y += Math.sin(angle) * speed * delta;
    if (pointer && pushRadius > 0) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0.001 && distance < pushRadius) {
        const push = (1 - distance / pushRadius) * speed * 2.2 * delta;
        x += (dx / distance) * push;
        y += (dy / distance) * push;
      }
    }
    const life = (state[at + 2] ?? 0) - delta;
    if (life <= 0 || x < -4 || y < -4 || x > width + 4 || y > height + 4) {
      respawnParticle(state, i, width, height, random);
    } else {
      state[at] = x;
      state[at + 1] = y;
      state[at + 2] = life;
    }
  }
}
