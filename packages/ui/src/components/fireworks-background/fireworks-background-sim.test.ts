import { describe, expect, it } from "vitest";

import {
  burstFireworks,
  createFireworksShow,
  FIREWORKS,
  fireworksSparkAlpha,
  frozenFireworks,
  launchFireworksRocket,
  stepFireworks,
  type FireworksShow,
  type FireworksSpark,
} from "./fireworks-background-sim";

function run(show: FireworksShow, seconds: number, options = {}) {
  for (let t = 0; t < seconds; t += 1 / 60) stepFireworks(show, 1 / 60, options);
}

function spark(overrides: Partial<FireworksSpark> = {}): FireworksSpark {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    age: 0,
    life: 1,
    color: 0,
    size: 1,
    phase: 0,
    drag: 1.5,
    gravity: 120,
    ...overrides,
  };
}

describe("launchFireworksRocket", () => {
  it("rises from the bottom and bursts at its target", () => {
    const show = createFireworksShow(800, 600, 3);
    const rocket = launchFireworksRocket(show, { x: 300, y: 150 });
    expect(rocket.y).toBe(604);
    expect(rocket.vy).toBeLessThan(0);
    let burstAt: { x: number; y: number } | undefined;
    for (let i = 0; i < 400 && !burstAt; i += 1) {
      const { x, y } = rocket;
      stepFireworks(show, 1 / 120, { autoLaunch: false });
      if (show.rockets.length === 0) burstAt = { x, y };
    }
    expect(burstAt?.x).toBeGreaterThan(285);
    expect(burstAt?.x).toBeLessThan(315);
    expect(burstAt?.y).toBeGreaterThan(140);
    expect(burstAt?.y).toBeLessThan(175);
    expect(show.sparks.length).toBeGreaterThan(0);
    expect(show.flashes).toHaveLength(1);
  });

  it("keeps a short trail while it climbs", () => {
    const show = createFireworksShow(800, 600);
    const rocket = launchFireworksRocket(show);
    run(show, 0.5, { autoLaunch: false });
    expect(rocket.trail.length).toBe(FIREWORKS.trail);
  });

  it("picks a spot in the upper half without a target, and still climbs from a low one", () => {
    const show = createFireworksShow(800, 600, 11);
    for (let i = 0; i < 20; i += 1) {
      const rocket = launchFireworksRocket(show);
      // Apex height from the launch speed.
      const apex = rocket.y - rocket.vy ** 2 / (2 * FIREWORKS.gravity);
      expect(apex).toBeGreaterThan(600 * 0.1);
      expect(apex).toBeLessThan(600 * 0.5);
    }
    const low = launchFireworksRocket(show, { x: 100, y: 700 });
    expect(low.vy).toBeLessThan(0);
  });

  it("cycles through the palette launch by launch", () => {
    const show = createFireworksShow(800, 600);
    const picked = Array.from(
      { length: 7 },
      () => launchFireworksRocket(show, undefined, { colors: 3 }).color,
    );
    expect(picked).toEqual([0, 1, 2, 0, 1, 2, 0]);
    expect(launchFireworksRocket(createFireworksShow(10, 10)).color).toBe(0);
  });
});

describe("burstFireworks", () => {
  it("throws a ring out at one even speed", () => {
    const show = createFireworksShow(480, 480);
    burstFireworks(show, 100, 100, 2, "ring", 40);
    expect(show.sparks).toHaveLength(40);
    const speeds = show.sparks.map((s) => Math.hypot(s.vx, s.vy));
    expect(Math.max(...speeds) / Math.min(...speeds)).toBeLessThan(1.07);
    expect(show.sparks.every((s) => s.color === 2)).toBe(true);
  });

  it("fills a peony from the centre outward", () => {
    const show = createFireworksShow(480, 480);
    burstFireworks(show, 100, 100, 0, "peony", 200);
    const speeds = show.sparks.map((s) => Math.hypot(s.vx, s.vy));
    expect(Math.max(...speeds) / Math.min(...speeds)).toBeGreaterThan(2);
  });

  it("makes a willow slow, long-lived and drooping", () => {
    const show = createFireworksShow(480, 480);
    burstFireworks(show, 100, 100, 0, "willow", 100);
    expect(show.sparks).toHaveLength(80);
    for (const s of show.sparks) {
      expect(s.life).toBeGreaterThanOrEqual(2);
      expect(s.drag).toBeLessThan(1.5);
    }
  });

  it("caps live sparks, dropping the oldest", () => {
    const show = createFireworksShow(480, 480);
    burstFireworks(show, 0, 0, 0, "peony", FIREWORKS.maxSparks);
    burstFireworks(show, 0, 0, 1, "peony", 10);
    expect(show.sparks).toHaveLength(FIREWORKS.maxSparks);
    expect(show.sparks.at(-1)?.color).toBe(1);
  });
});

describe("stepFireworks", () => {
  it("is deterministic for a seed", () => {
    const a = createFireworksShow(640, 360, 5);
    const b = createFireworksShow(640, 360, 5);
    run(a, 3);
    run(b, 3);
    expect(a.sparks.map((s) => [s.x, s.y])).toEqual(b.sparks.map((s) => [s.x, s.y]));
  });

  it("launches on a timer only with autoLaunch, at about the rate", () => {
    const auto = createFireworksShow(640, 360, 2);
    let launches = 0;
    for (let t = 0; t < 20; t += 1 / 60) {
      const before = auto.rockets.length;
      stepFireworks(auto, 1 / 60, { rate: 1 });
      if (auto.rockets.length > before) launches += 1;
    }
    expect(launches).toBeGreaterThan(12);
    expect(launches).toBeLessThan(30);

    const off = createFireworksShow(640, 360, 2);
    run(off, 5, { autoLaunch: false });
    expect(off.rockets).toEqual([]);
    expect(off.sparks).toEqual([]);
  });

  it("caps the automatic rate at three a second", () => {
    const show = createFireworksShow(640, 360, 4);
    let launches = 0;
    for (let t = 0; t < 10; t += 1 / 60) {
      const before = show.rockets.length;
      stepFireworks(show, 1 / 60, { rate: 50 });
      if (show.rockets.length > before) launches += 1;
    }
    expect(launches).toBeLessThanOrEqual(40);
  });

  it("drags and drops sparks, fades them, and removes the spent", () => {
    const show = createFireworksShow(800, 600);
    show.untilLaunch = 100;
    show.sparks.push(spark({ x: 100, y: 100, vx: 200, life: 1 }));
    stepFireworks(show, 0.1);
    const [s] = show.sparks;
    expect(s?.vx).toBeLessThan(200);
    expect(s?.vy).toBeGreaterThan(0);
    expect(s?.x).toBeGreaterThan(100);
    run(show, 1);
    expect(show.sparks).toEqual([]);
    expect(show.flashes).toEqual([]);
  });

  it("drops sparks that fall out of the box", () => {
    const show = createFireworksShow(800, 600);
    show.untilLaunch = 100;
    show.sparks.push(spark({ y: 650, life: 5 }));
    stepFireworks(show, 0.01);
    expect(show.sparks).toEqual([]);
  });

  it("does nothing for a zero step", () => {
    const show = createFireworksShow(800, 600);
    stepFireworks(show, 0);
    expect(show.untilLaunch).toBe(0.25);
  });
});

describe("fireworksSparkAlpha", () => {
  it("fades over the spark's life and crackles over its second half", () => {
    expect(fireworksSparkAlpha(spark({ age: 0 }))).toBe(1);
    expect(fireworksSparkAlpha(spark({ age: 0.25 }))).toBeCloseTo(0.75 ** 1.3);
    const late = Array.from({ length: 20 }, (_, i) =>
      fireworksSparkAlpha(spark({ age: 0.6 + i * 0.005 })),
    );
    expect(Math.max(...late) - Math.min(...late)).toBeGreaterThan(0.05);
    expect(fireworksSparkAlpha(spark({ age: 2 }))).toBe(0);
  });
});

describe("frozenFireworks", () => {
  it("is three open bursts in different colours, with no rockets or flashes", () => {
    const show = frozenFireworks(800, 400, { colors: 6, particleCount: 50 });
    expect(show.rockets).toEqual([]);
    expect(show.flashes).toEqual([]);
    expect(new Set(show.sparks.map((s) => s.color))).toEqual(new Set([0, 1, 2]));
    expect(show.sparks.length).toBeGreaterThan(100);
    for (const s of show.sparks) expect(fireworksSparkAlpha(s)).toBeGreaterThan(0.2);
    expect(frozenFireworks(800, 400, { colors: 6, particleCount: 50 }).sparks).toEqual(
      show.sparks.map((s) => ({ ...s })),
    );
  });

  it("uses one colour when the palette has one, and the default count", () => {
    const show = frozenFireworks(800, 400);
    expect(new Set(show.sparks.map((s) => s.color))).toEqual(new Set([0]));
    expect(show.sparks.length).toBeGreaterThan(150);
  });
});
