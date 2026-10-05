import { describe, expect, it } from "vitest";

import {
  createStarsBackgroundRandom,
  createStarsBackgroundStars,
  spawnStarsBackgroundStreak,
  STARS_BACKGROUND_LAYERS,
  starsBackgroundCount,
  starsBackgroundPosition,
  starsBackgroundStreakDelay,
  starsBackgroundStreakShape,
  starsBackgroundTwinkle,
  stepStarsBackgroundStreaks,
  type StarsBackgroundStar,
} from "./stars-background-sim";

const STAR: StarsBackgroundStar = {
  x: 0.5,
  y: 0.5,
  layer: 2,
  radius: 1,
  phase: 0,
  rate: 1,
  brightness: 1,
};

describe("starsBackgroundCount", () => {
  it("scales with area and density, capped, and is zero for an empty box", () => {
    expect(starsBackgroundCount(400, 400, 1)).toBe(100);
    expect(starsBackgroundCount(400, 400, 2)).toBe(200);
    expect(starsBackgroundCount(10000, 10000, 1)).toBe(1600);
    expect(starsBackgroundCount(0, 400, 1)).toBe(0);
    expect(starsBackgroundCount(400, 400, 0)).toBe(0);
    expect(starsBackgroundCount(Number.NaN, 400, 1)).toBe(0);
  });
});

describe("createStarsBackgroundStars", () => {
  it("is deterministic for a seed and differs across seeds", () => {
    expect(createStarsBackgroundStars(50, 3)).toEqual(createStarsBackgroundStars(50, 3));
    expect(createStarsBackgroundStars(50, 3)).not.toEqual(createStarsBackgroundStars(50, 4));
  });

  it("spreads stars across the layers by share, far layer the fullest", () => {
    const stars = createStarsBackgroundStars(200);
    expect(stars).toHaveLength(200);
    const perLayer = STARS_BACKGROUND_LAYERS.map(
      (_, index) => stars.filter((star) => star.layer === index).length,
    );
    expect(perLayer).toEqual([110, 60, 30]);
    for (const star of stars) {
      const [min, max] = STARS_BACKGROUND_LAYERS[star.layer]?.radius ?? [0, 0];
      expect(star.radius).toBeGreaterThanOrEqual(min);
      expect(star.radius).toBeLessThanOrEqual(max);
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThan(1);
    }
  });

  it("handles tiny counts without overfilling a layer", () => {
    expect(createStarsBackgroundStars(0)).toEqual([]);
    expect(createStarsBackgroundStars(1)).toHaveLength(1);
  });
});

describe("starsBackgroundTwinkle", () => {
  it("stays within its bounds and varies over time", () => {
    const samples = Array.from({ length: 200 }, (_, i) =>
      starsBackgroundTwinkle(STAR, i * 0.05),
    );
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0.08);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.3);
  });

  it("never drops below the floor for a dim star", () => {
    expect(starsBackgroundTwinkle({ ...STAR, brightness: 0 }, 4.7)).toBe(0.08);
  });
});

describe("starsBackgroundPosition", () => {
  it("places a star at its home at time zero", () => {
    expect(starsBackgroundPosition(STAR, 0, 200, 100)).toEqual({ x: 100, y: 50 });
  });

  it("drifts up and toward the start, nearer layers faster", () => {
    const near = starsBackgroundPosition(STAR, 1, 200, 100);
    const far = starsBackgroundPosition({ ...STAR, layer: 0 }, 1, 200, 100);
    expect(near.y).toBeLessThan(50);
    expect(near.x).toBeLessThan(100);
    expect(50 - near.y).toBeGreaterThan(50 - far.y);
    expect(starsBackgroundPosition(STAR, 1, 200, 100, { speed: 0 })).toEqual({ x: 100, y: 50 });
  });

  it("applies the parallax shift and wraps within a margin of the box", () => {
    expect(starsBackgroundPosition(STAR, 0, 200, 100, { shiftX: 10, shiftY: -5 })).toEqual({
      x: 110,
      y: 45,
    });
    for (let t = 0; t < 60; t += 0.7) {
      const { x, y } = starsBackgroundPosition(STAR, t, 200, 100);
      expect(x).toBeGreaterThanOrEqual(-4);
      expect(x).toBeLessThan(204);
      expect(y).toBeGreaterThanOrEqual(-4);
      expect(y).toBeLessThan(104);
    }
  });

  it("falls back to the far layer for an unknown layer", () => {
    const odd = starsBackgroundPosition({ ...STAR, layer: 9 }, 1, 200, 100);
    const far = starsBackgroundPosition({ ...STAR, layer: 0 }, 1, 200, 100);
    expect(odd).toEqual(far);
  });
});

describe("shooting stars", () => {
  it("spawn in the upper part of the box, heading downward", () => {
    const random = createStarsBackgroundRandom(5);
    for (let i = 0; i < 40; i += 1) {
      const streak = spawnStarsBackgroundStreak(random, 800, 400);
      expect(streak.y).toBeLessThanOrEqual(160);
      expect(Math.sin(streak.angle)).toBeGreaterThan(0);
      expect(streak.life).toBeGreaterThanOrEqual(0.8);
    }
  });

  it("move along their heading and are dropped when spent", () => {
    const random = createStarsBackgroundRandom(2);
    const streak = spawnStarsBackgroundStreak(random, 800, 400);
    const { x, y } = streak;
    let streaks = stepStarsBackgroundStreaks([streak], 0.1);
    expect(streaks).toHaveLength(1);
    expect(Math.hypot(streak.x - x, streak.y - y)).toBeCloseTo(streak.speed * 0.1);
    streaks = stepStarsBackgroundStreaks(streaks, 2);
    expect(streaks).toEqual([]);
  });

  it("flare in, then burn out, with the tail extending", () => {
    const base = { x: 0, y: 0, angle: 1, speed: 1, length: 100, life: 1 };
    expect(starsBackgroundStreakShape({ ...base, age: 0 })).toEqual({ alpha: 0, extent: 0 });
    const flare = starsBackgroundStreakShape({ ...base, age: 0.15 });
    expect(flare.alpha).toBeCloseTo(1);
    expect(flare.extent).toBeCloseTo(0.45);
    expect(starsBackgroundStreakShape({ ...base, age: 0.6 }).extent).toBe(1);
    expect(starsBackgroundStreakShape({ ...base, age: 1 }).alpha).toBe(0);
    expect(starsBackgroundStreakShape({ ...base, age: 3 }).alpha).toBe(0);
  });

  it("are spaced a few seconds apart, deterministically", () => {
    const a = createStarsBackgroundRandom(9);
    const b = createStarsBackgroundRandom(9);
    for (let i = 0; i < 20; i += 1) {
      const delay = starsBackgroundStreakDelay(a);
      expect(delay).toBe(starsBackgroundStreakDelay(b));
      expect(delay).toBeGreaterThanOrEqual(2.5);
      expect(delay).toBeLessThanOrEqual(6);
    }
  });
});
