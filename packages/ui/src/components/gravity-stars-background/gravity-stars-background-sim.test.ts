import { describe, expect, it } from "vitest";

import {
  addGravityStarsWave,
  createGravityStarsWorld,
  GRAVITY_STARS,
  gravityStarsCount,
  gravityStarsLinks,
  resizeGravityStarsWorld,
  setGravityStarsPointer,
  stepGravityStars,
  type GravityStar,
  type GravityStarsWorld,
} from "./gravity-stars-background-sim";

function run(world: GravityStarsWorld, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) stepGravityStars(world, 1 / 60);
}

function star(overrides: Partial<GravityStar> = {}): GravityStar {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    driftX: 0,
    driftY: 0,
    radius: 1,
    phase: 0,
    heat: 0,
    ...overrides,
  };
}

function lone(overrides: Partial<GravityStar> = {}): GravityStarsWorld {
  return { width: 800, height: 600, stars: [star(overrides)], waves: [], pointer: null };
}

describe("gravityStarsCount", () => {
  it("scales with area and density, capped, and is zero for an empty box", () => {
    expect(gravityStarsCount(500, 500, 1)).toBe(50);
    expect(gravityStarsCount(500, 500, 2)).toBe(100);
    expect(gravityStarsCount(5000, 5000, 1)).toBe(320);
    expect(gravityStarsCount(0, 500, 1)).toBe(0);
    expect(gravityStarsCount(500, 500, -1)).toBe(0);
  });
});

describe("createGravityStarsWorld", () => {
  it("is deterministic for a seed and scatters particles inside the box", () => {
    const a = createGravityStarsWorld(400, 300, 40, 7);
    expect(a).toEqual(createGravityStarsWorld(400, 300, 40, 7));
    expect(a.stars).not.toEqual(createGravityStarsWorld(400, 300, 40, 8).stars);
    for (const s of a.stars) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThan(400);
      expect(s.y).toBeLessThan(300);
      expect(Math.hypot(s.driftX, s.driftY)).toBeGreaterThanOrEqual(6);
      expect(Math.hypot(s.driftX, s.driftY)).toBeLessThanOrEqual(22);
      expect(s.vx).toBe(s.driftX);
    }
  });
});

describe("stepGravityStars", () => {
  it("drifts a free particle at its resting velocity, and wraps it at the edges", () => {
    const world = lone({ x: 100, y: 100, vx: 10, vy: 0, driftX: 10 });
    stepGravityStars(world, 1);
    expect(world.stars[0]?.x).toBeCloseTo(110);
    const edge = lone({ x: 805, y: 300, vx: 600, driftX: 600 });
    stepGravityStars(edge, 1 / 60);
    expect(edge.stars[0]?.x).toBeCloseTo(815 - 800 - GRAVITY_STARS.margin * 2);
    const top = lone({ x: 300, y: -10, vy: -600, driftY: -600 });
    stepGravityStars(top, 1 / 60);
    expect(top.stars[0]?.y).toBeGreaterThan(600);
  });

  it("does nothing for a zero or negative step", () => {
    const world = lone({ x: 100, y: 100, vx: 10 });
    stepGravityStars(world, 0);
    stepGravityStars(world, -1);
    expect(world.stars[0]?.x).toBe(100);
  });

  it("relaxes a flung particle back to its drift", () => {
    const world = lone({ x: 400, y: 300, vx: 900, driftX: 10 });
    run(world, 1);
    expect(world.stars[0]?.vx).toBeLessThan(450);
    run(world, 9);
    expect(world.stars[0]?.vx).toBeCloseTo(10, 0);
  });

  it("pulls nearby particles in and holds them in orbit, ignoring distant ones", () => {
    const world = lone({ x: 500, y: 300 });
    world.stars.push(star({ x: 50, y: 50 }));
    setGravityStarsPointer(world, { x: 400, y: 300 });
    stepGravityStars(world, 1 / 60);
    const [near, far] = world.stars;
    expect(near?.vx).toBeLessThan(0);
    // The swirl turns the fall sideways.
    expect(near?.vy).not.toBe(0);
    expect(far?.vx).toBe(0);

    run(world, 4);
    const distance = Math.hypot((near?.x ?? 0) - 400, (near?.y ?? 0) - 300);
    expect(distance).toBeLessThan(GRAVITY_STARS.radius);
    expect(near?.heat).toBeGreaterThan(0.2);
  });

  it("flings captured particles outward when the well lets go", () => {
    const world = lone({ x: 450, y: 300, vx: 0, vy: 200 });
    world.stars.push(star({ x: 10, y: 10, vx: 5 }));
    setGravityStarsPointer(world, { x: 400, y: 300 });
    setGravityStarsPointer(world, null);
    const [captured, free] = world.stars;
    expect(captured?.vy).toBeCloseTo(300);
    expect(captured?.vx).toBeGreaterThan(0);
    expect(free?.vx).toBe(5);
    // Releasing again, or moving the well, flings nothing.
    setGravityStarsPointer(world, null);
    expect(captured?.vy).toBeCloseTo(300);
  });

  it("caps speed", () => {
    const world = lone({ x: 400, y: 300, vx: 50000 });
    stepGravityStars(world, 1 / 60);
    expect(Math.hypot(world.stars[0]?.vx ?? 0, world.stars[0]?.vy ?? 0)).toBeCloseTo(
      GRAVITY_STARS.maxSpeed,
    );
  });
});

describe("shockwaves", () => {
  it("kick a particle outward once, as the front passes it, then expire", () => {
    const world = lone({ x: 400 + 100, y: 300 });
    world.stars.push(star({ x: 400, y: 300 }));
    addGravityStarsWave(world, 400, 300);
    // The front reaches 100px after ~0.14s.
    stepGravityStars(world, 0.1);
    expect(world.stars[0]?.vx).toBe(0);
    stepGravityStars(world, 0.1);
    const kicked = world.stars[0]?.vx ?? 0;
    expect(kicked).toBeGreaterThan(300);
    // The particle at the centre is kicked along +x when the wave is born.
    expect(world.stars[1]?.vx).toBeGreaterThan(0);
    run(world, 1);
    expect(world.waves).toEqual([]);
  });

  it("keeps at most six waves alive", () => {
    const world = lone();
    for (let i = 0; i < 9; i += 1) addGravityStarsWave(world, i, 0);
    expect(world.waves).toHaveLength(6);
    expect(world.waves[0]?.x).toBe(3);
  });
});

describe("resizeGravityStarsWorld", () => {
  it("rescales positions to the new box", () => {
    const world = lone({ x: 400, y: 300 });
    resizeGravityStarsWorld(world, 400, 300);
    expect(world.stars[0]).toMatchObject({ x: 200, y: 150 });
    expect(world).toMatchObject({ width: 400, height: 300 });
  });

  it("only adopts the size of a world that had none", () => {
    const world = { ...lone({ x: 5, y: 5 }), width: 0, height: 0 };
    resizeGravityStarsWorld(world, 400, 300);
    expect(world.stars[0]).toMatchObject({ x: 5, y: 5 });
    expect(world.width).toBe(400);
  });
});

describe("gravityStarsLinks", () => {
  it("joins only close pairs, stronger when closer", () => {
    const stars = [star({ x: 0 }), star({ x: 30 }), star({ x: 90 }), star({ x: 500 })];
    const links = gravityStarsLinks(stars, 100);
    expect(links.map(([i, j]) => [i, j])).toEqual([
      [0, 1],
      [0, 2],
      [1, 2],
    ]);
    expect(links[0]?.[2]).toBeCloseTo(0.7);
    expect(links[1]?.[2]).toBeCloseTo(0.1);
    expect(gravityStarsLinks(stars, 0)).toEqual([]);
  });
});
