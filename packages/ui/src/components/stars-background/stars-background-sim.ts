// Original design (pattern inspired by Animate UI Stars Background; no code referenced).

/*
 * The pure half of StarsBackground: a seeded starfield in three depth layers,
 * where each star twinkles on its own clock, and the shooting stars that cross
 * it now and then. Positions are stored as fractions of the box, so a resize
 * re-flows the field instead of re-rolling it, and everything takes its time
 * and randomness as arguments, so a test can pin any frame.
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

export interface StarsBackgroundLayer {
  /** Parallax weight: how far the layer follows the pointer, 0–1. */
  depth: number;
  /** Drift in CSS pixels a second at `speed` 1. */
  speed: number;
  /** Radius range in CSS pixels. */
  radius: readonly [number, number];
  /** Share of the stars that live in this layer. */
  share: number;
  /** Peak opacity. Far layers are dimmer. */
  brightness: number;
}

/** Far, middle and near. The near layer is sparse, large and fast. */
export const STARS_BACKGROUND_LAYERS: readonly StarsBackgroundLayer[] = [
  { depth: 0.2, speed: 5, radius: [0.35, 0.8], share: 0.55, brightness: 0.55 },
  { depth: 0.5, speed: 11, radius: [0.6, 1.15], share: 0.3, brightness: 0.8 },
  { depth: 1, speed: 22, radius: [0.9, 1.7], share: 0.15, brightness: 1 },
];

/** The drift heading: mostly up, a little toward the start edge. */
const DRIFT_X = -0.28;
const DRIFT_Y = -0.96;

export interface StarsBackgroundStar {
  /** Position as a fraction of the box, 0–1. */
  x: number;
  y: number;
  layer: number;
  radius: number;
  /** Twinkle phase (radians) and rate (radians a second). */
  phase: number;
  rate: number;
  /** Resting brightness, 0–1, before the layer's own. */
  brightness: number;
}

export interface StarsBackgroundStreak {
  x: number;
  y: number;
  /** Heading in radians. */
  angle: number;
  /** Pixels a second. */
  speed: number;
  /** Tail length in pixels at full extension. */
  length: number;
  age: number;
  life: number;
}

/** How many stars a box holds at a given density (1 ≈ one per 1,600px²). */
export function starsBackgroundCount(width: number, height: number, density: number): number {
  if (!(width > 0) || !(height > 0) || !(density > 0)) return 0;
  return Math.min(1600, Math.round(((width * height) / 1600) * density));
}

/** Rolls `count` stars, spread across the layers by their share. */
export function createStarsBackgroundStars(count: number, seed = 1): StarsBackgroundStar[] {
  const random = seeded(seed);
  const stars: StarsBackgroundStar[] = [];
  let start = 0;
  STARS_BACKGROUND_LAYERS.forEach((layer, index) => {
    const last = index === STARS_BACKGROUND_LAYERS.length - 1;
    const end = last ? count : Math.min(count, start + Math.round(count * layer.share));
    for (let i = start; i < end; i += 1) {
      const [min, max] = layer.radius;
      stars.push({
        x: random(),
        y: random(),
        layer: index,
        radius: min + (max - min) * random() ** 2,
        phase: random() * Math.PI * 2,
        rate: 0.6 + random() * 2.4,
        brightness: 0.35 + random() * 0.65,
      });
    }
    start = end;
  });
  return stars;
}

/**
 * Opacity of a star at `time`: a slow breath with a sharper sparkle on top,
 * so neighbours never pulse in step. Always within 0.08–1.
 */
export function starsBackgroundTwinkle(star: StarsBackgroundStar, time: number): number {
  const breath = 0.5 + 0.5 * Math.sin(time * star.rate + star.phase);
  const sparkle = Math.max(0, Math.sin(time * star.rate * 2.3 + star.phase * 1.7)) ** 6;
  const value = star.brightness * (0.35 + 0.5 * breath) + 0.3 * sparkle;
  return Math.min(1, Math.max(0.08, value));
}

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

/**
 * Where a star is drawn: its home, carried along the drift heading by its
 * layer's speed, shifted by the parallax offset, wrapped round the box with a
 * margin so it never pops at an edge.
 */
export function starsBackgroundPosition(
  star: StarsBackgroundStar,
  time: number,
  width: number,
  height: number,
  options: { speed?: number; shiftX?: number; shiftY?: number } = {},
): { x: number; y: number } {
  const { speed = 1, shiftX = 0, shiftY = 0 } = options;
  const layer = STARS_BACKGROUND_LAYERS[star.layer] ?? STARS_BACKGROUND_LAYERS[0];
  const travel = time * (layer?.speed ?? 0) * speed;
  const margin = 4;
  const spanX = width + margin * 2;
  const spanY = height + margin * 2;
  return {
    x: wrap(star.x * width + travel * DRIFT_X + shiftX + margin, spanX) - margin,
    y: wrap(star.y * height + travel * DRIFT_Y + shiftY + margin, spanY) - margin,
  };
}

/** A shooting star entering from the upper part of the box, heading down and across. */
export function spawnStarsBackgroundStreak(
  random: () => number,
  width: number,
  height: number,
): StarsBackgroundStreak {
  const leftward = random() < 0.5;
  const angle = (leftward ? Math.PI * 0.8 : Math.PI * 0.2) + (random() - 0.5) * 0.25;
  const scale = Math.max(1, Math.hypot(width, height) / 900);
  return {
    x: width * (leftward ? 0.45 + random() * 0.55 : random() * 0.55),
    y: height * random() * 0.4,
    angle,
    speed: (650 + random() * 450) * scale,
    length: (90 + random() * 90) * scale,
    age: 0,
    life: 0.8 + random() * 0.5,
  };
}

/** Advances streaks by `dt` seconds, in place, and drops the finished ones. */
export function stepStarsBackgroundStreaks(
  streaks: StarsBackgroundStreak[],
  dt: number,
): StarsBackgroundStreak[] {
  for (const streak of streaks) {
    streak.age += dt;
    streak.x += Math.cos(streak.angle) * streak.speed * dt;
    streak.y += Math.sin(streak.angle) * streak.speed * dt;
  }
  return streaks.filter((streak) => streak.age < streak.life);
}

/** Opacity and tail extension (0–1) of a streak: it flares in fast and burns out slowly. */
export function starsBackgroundStreakShape(streak: StarsBackgroundStreak): {
  alpha: number;
  extent: number;
} {
  const t = Math.min(1, Math.max(0, streak.age / streak.life));
  const alpha = t < 0.15 ? t / 0.15 : (1 - t) / 0.85;
  return { alpha: Math.max(0, alpha), extent: Math.min(1, t * 3) };
}

/** Seconds until the next shooting star: about every four seconds, never in a burst. */
export function starsBackgroundStreakDelay(random: () => number): number {
  return 2.5 + random() * 3.5;
}

/** A seeded generator for the component's own streak timing. */
export function createStarsBackgroundRandom(seed = 1): () => number {
  return seeded(seed);
}
