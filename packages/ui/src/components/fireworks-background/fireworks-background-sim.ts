// Original design (pattern inspired by Animate UI Fireworks Background; no code referenced).

/*
 * The pure half of FireworksBackground: rockets, bursts and sparks.
 *
 * - A rocket leaves the bottom edge with exactly the speed that lets gravity
 *   bring it to rest at its target height, and the sideways speed that lands
 *   it on its target x at that moment — so a click launches a rocket that
 *   bursts where you clicked. It bursts at its apex.
 * - A burst is one of three shapes: a peony (a filled sphere: random speeds
 *   weighted outward), a ring (one speed, evenly spaced) or a willow (slow,
 *   long-lived sparks that droop). Sparks feel drag and gravity, fade out, and
 *   twinkle as they die.
 * - Colours are indices into the component's palette, cycling launch by launch.
 *
 * Everything is in CSS pixels and seconds with seeded randomness, so tests
 * can replay any show.
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

export const FIREWORKS = {
  /** Gravity on rockets, px/s². */
  gravity: 260,
  /** Points kept in a rocket's trail. */
  trail: 10,
  /** Hard cap on live sparks, oldest dropped first. */
  maxSparks: 2400,
  flashLife: 0.3,
} as const;

export type FireworksBurstStyle = "peony" | "ring" | "willow";

export interface FireworksRocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  style: FireworksBurstStyle;
  trail: { x: number; y: number }[];
}

export interface FireworksSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: number;
  size: number;
  phase: number;
  drag: number;
  gravity: number;
}

export interface FireworksFlash {
  x: number;
  y: number;
  age: number;
  color: number;
}

export interface FireworksShow {
  width: number;
  height: number;
  rockets: FireworksRocket[];
  sparks: FireworksSpark[];
  flashes: FireworksFlash[];
  /** Palette index the next rocket takes. */
  nextColor: number;
  /** Seconds until the next automatic launch. */
  untilLaunch: number;
  random: () => number;
}

export interface FireworksOptions {
  /** Number of colours in the palette. Default 1. */
  colors?: number;
  /** Sparks per burst. Default 70. */
  particleCount?: number;
}

export function createFireworksShow(width: number, height: number, seed = 1): FireworksShow {
  return {
    width,
    height,
    rockets: [],
    sparks: [],
    flashes: [],
    nextColor: 0,
    untilLaunch: 0.25,
    random: seeded(seed),
  };
}

/** Burst size scales gently with the box, so a card and a hero both look right. */
function scaleOf(show: FireworksShow): number {
  return Math.min(1.6, Math.max(0.55, Math.min(show.width, show.height) / 480));
}

function pickStyle(random: () => number): FireworksBurstStyle {
  const roll = random();
  if (roll < 0.55) return "peony";
  return roll < 0.8 ? "ring" : "willow";
}

/**
 * Launches a rocket from the bottom edge. With a target it bursts there;
 * without one it picks a spot in the upper half.
 */
export function launchFireworksRocket(
  show: FireworksShow,
  target?: { x: number; y: number },
  options: FireworksOptions = {},
): FireworksRocket {
  const { width, height, random } = show;
  const colors = Math.max(1, options.colors ?? 1);
  const goalX = target?.x ?? width * (0.15 + random() * 0.7);
  const goalY = target?.y ?? height * (0.12 + random() * 0.33);
  const startY = height + 4;
  const startX = target
    ? Math.min(width * 0.95, Math.max(width * 0.05, goalX + (random() - 0.5) * width * 0.25))
    : goalX + (random() - 0.5) * width * 0.2;
  const rise = Math.max(40, startY - goalY);
  const speed = Math.sqrt(2 * FIREWORKS.gravity * rise);
  const flight = speed / FIREWORKS.gravity;
  const rocket: FireworksRocket = {
    x: startX,
    y: startY,
    vx: (goalX - startX) / flight,
    vy: -speed,
    color: show.nextColor % colors,
    style: pickStyle(random),
    trail: [],
  };
  show.nextColor = (show.nextColor + 1) % colors;
  show.rockets.push(rocket);
  return rocket;
}

/** Bursts at a point: sparks in the given style, plus a brief flash. */
export function burstFireworks(
  show: FireworksShow,
  x: number,
  y: number,
  color: number,
  style: FireworksBurstStyle,
  count = 70,
): void {
  const { random } = show;
  const base = 175 * scaleOf(show);
  const total = Math.max(0, Math.round(style === "willow" ? count * 0.8 : count));
  for (let i = 0; i < total; i += 1) {
    let angle: number;
    let speed: number;
    let life: number;
    let drag = 1.5;
    let gravity = 120;
    if (style === "ring") {
      angle = (i / total) * Math.PI * 2 + random() * 0.04;
      speed = base * (0.92 + random() * 0.06);
      life = 1 + random() * 0.4;
    } else if (style === "willow") {
      angle = random() * Math.PI * 2;
      speed = base * 0.75 * Math.sqrt(random());
      life = 2 + random() * 0.8;
      drag = 0.9;
      gravity = 60;
    } else {
      angle = random() * Math.PI * 2;
      speed = base * (0.3 + 0.7 * Math.sqrt(random()));
      life = 1.1 + random() * 0.6;
    }
    show.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      life,
      color,
      size: 1 + random() * 1.2,
      phase: random() * Math.PI * 2,
      drag,
      gravity,
    });
  }
  if (show.sparks.length > FIREWORKS.maxSparks) {
    show.sparks = show.sparks.slice(show.sparks.length - FIREWORKS.maxSparks);
  }
  show.flashes.push({ x, y, age: 0, color });
}

export interface FireworksStepOptions extends FireworksOptions {
  /** Launch rockets on a timer. Default true. */
  autoLaunch?: boolean;
  /** Automatic launches a second, on average, capped at 3. Default 0.8. */
  rate?: number;
}

/** Advances the show by `dt` seconds, in place. */
export function stepFireworks(
  show: FireworksShow,
  dt: number,
  options: FireworksStepOptions = {},
): void {
  if (dt <= 0) return;
  const { autoLaunch = true, rate = 0.8, particleCount = 70 } = options;

  show.untilLaunch -= dt;
  if (show.untilLaunch <= 0) {
    if (autoLaunch && rate > 0) launchFireworksRocket(show, undefined, options);
    show.untilLaunch = (0.55 + show.random() * 0.9) / Math.min(3, Math.max(rate, 0.05));
  }

  const remaining: FireworksRocket[] = [];
  for (const rocket of show.rockets) {
    rocket.vy += FIREWORKS.gravity * dt;
    rocket.x += rocket.vx * dt;
    rocket.y += rocket.vy * dt;
    rocket.trail.push({ x: rocket.x, y: rocket.y });
    if (rocket.trail.length > FIREWORKS.trail) rocket.trail.shift();
    if (rocket.vy >= -12) {
      burstFireworks(show, rocket.x, rocket.y, rocket.color, rocket.style, particleCount);
    } else {
      remaining.push(rocket);
    }
  }
  show.rockets = remaining;

  for (const spark of show.sparks) {
    const slow = Math.exp(-spark.drag * dt);
    spark.vx *= slow;
    spark.vy = spark.vy * slow + spark.gravity * dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.age += dt;
  }
  show.sparks = show.sparks.filter(
    (spark) => spark.age < spark.life && spark.y < show.height + 40,
  );

  for (const flash of show.flashes) flash.age += dt;
  show.flashes = show.flashes.filter((flash) => flash.age < FIREWORKS.flashLife);
}

/** A spark's opacity: a long fade, with a crackling twinkle over its last half. */
export function fireworksSparkAlpha(spark: FireworksSpark): number {
  const t = Math.min(1, Math.max(0, spark.age / spark.life));
  const fade = (1 - t) ** 1.3;
  if (t < 0.5) return fade;
  return fade * (0.6 + 0.4 * Math.sin(spark.age * 42 + spark.phase));
}

/**
 * The reduced-motion frame: three bursts in different colours and shapes,
 * frozen just after they open, and no rockets in flight.
 */
export function frozenFireworks(
  width: number,
  height: number,
  options: FireworksOptions = {},
  seed = 1,
): FireworksShow {
  const show = createFireworksShow(width, height, seed);
  const colors = Math.max(1, options.colors ?? 1);
  const count = options.particleCount ?? 70;
  const spots: [number, number, FireworksBurstStyle][] = [
    [0.27, 0.34, "peony"],
    [0.62, 0.22, "ring"],
    [0.82, 0.48, "willow"],
  ];
  spots.forEach(([fx, fy, style], index) => {
    burstFireworks(show, width * fx, height * fy, index % colors, style, count);
  });
  for (let i = 0; i < 8; i += 1) stepFireworks(show, 0.05, { ...options, autoLaunch: false });
  show.flashes = [];
  return show;
}
