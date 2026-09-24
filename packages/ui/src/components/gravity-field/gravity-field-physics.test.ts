import { describe, expect, it } from "vitest";

import {
  awakeCount,
  contain,
  createBody,
  createWorld,
  PHYSICS,
  placeFree,
  settle,
  step,
  wakeAll,
  type GravityWorld,
} from "./gravity-field-physics";

/** Runs the world for `seconds` at 60 frames a second. */
function run(world: GravityWorld, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) step(world, 1 / 60);
}

/** A deterministic sprinkle of discs across the top of the box. */
function pour(world: GravityWorld, count: number, r = 14) {
  for (let i = 0; i < count; i += 1) {
    const x = 40 + ((i * 37) % (world.width - 80));
    const body = createBody(i, x, 20 + (i % 3) * 4, r * (0.85 + ((i * 7) % 10) / 30), {
      vx: ((i % 5) - 2) * 15,
      spin: ((i % 7) - 3) * 1.5,
    });
    placeFree(world, body);
    world.bodies.push(body);
    run(world, 0.05);
  }
}

function worstOverlap(world: GravityWorld) {
  let worst = 0;
  const { bodies } = world;
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i]!;
      const b = bodies[j]!;
      const overlap = a.r + b.r - Math.hypot(a.x - b.x, a.y - b.y);
      if (overlap > worst) worst = overlap;
    }
  }
  return worst;
}

describe("gravity field physics", () => {
  it("drops a disc onto the floor, where it comes to rest and sleeps", () => {
    const world = createWorld(300, 200);
    const body = createBody(1, 150, 20, 15);
    world.bodies.push(body);
    run(world, 0.1);
    expect(body.vy).toBeGreaterThan(0);
    run(world, 3);
    expect(body.asleep).toBe(true);
    expect(body.y).toBeCloseTo(200 - 15, 0);
    expect(awakeCount(world)).toBe(0);
  });

  it("bounces softly on a hard landing", () => {
    const world = createWorld(300, 400);
    const body = createBody(1, 150, 20, 15);
    world.bodies.push(body);
    let bounced = false;
    for (let t = 0; t < 1.5; t += 1 / 60) {
      step(world, 1 / 60);
      if (body.vy < -50) bounced = true;
    }
    expect(bounced).toBe(true);
  });

  it("tumbles a disc that lands on the side of another", () => {
    const world = createWorld(300, 200);
    const base = createBody(1, 150, 185, 15);
    base.asleep = true;
    const falling = createBody(2, 162, 40, 15);
    world.bodies.push(base, falling);
    run(world, 0.4);
    expect(Math.abs(falling.angle)).toBeGreaterThan(0.2);
  });

  it("rolls with spin that matches its direction", () => {
    const world = createWorld(600, 200);
    const body = createBody(1, 100, 185, 15, { vx: 300 });
    world.bodies.push(body);
    run(world, 0.2);
    expect(body.spin).toBeGreaterThan(0);
  });

  it("piles discs into a still heap with no deep overlaps, inside the box", () => {
    const world = createWorld(320, 240);
    pour(world, 60);
    run(world, 6);
    expect(awakeCount(world)).toBe(0);
    expect(worstOverlap(world)).toBeLessThan(3);
    for (const body of world.bodies) {
      expect(body.x).toBeGreaterThanOrEqual(body.r - 1);
      expect(body.x).toBeLessThanOrEqual(world.width - body.r + 1);
      expect(body.y).toBeLessThanOrEqual(world.height - body.r + 1);
    }
  });

  it("builds a hill rather than a flat layer", () => {
    const world = createWorld(400, 300);
    for (let i = 0; i < 40; i += 1) {
      const body = createBody(i, 200 + ((i % 5) - 2), 20, 12);
      placeFree(world, body);
      world.bodies.push(body);
      run(world, 0.12);
    }
    run(world, 5);
    const lowest = Math.max(...world.bodies.map((b) => b.y));
    const highest = Math.min(...world.bodies.map((b) => b.y));
    // More than two layers tall, so it did not spread into one row.
    expect(lowest - highest).toBeGreaterThan(12 * 4);
    const centre = world.bodies.filter((b) => Math.abs(b.x - 200) < 40).length;
    const edges = world.bodies.filter((b) => b.x < 60 || b.x > 340).length;
    expect(centre).toBeGreaterThan(edges);
  });

  it("stays asleep until disturbed, then spills toward new gravity", () => {
    const world = createWorld(320, 240);
    pour(world, 20);
    run(world, 5);
    expect(awakeCount(world)).toBe(0);
    const before = world.bodies.map((b) => [b.x, b.y]);
    run(world, 1);
    expect(world.bodies.map((b) => [b.x, b.y])).toEqual(before);

    world.gx = 2000;
    world.gy = 600;
    wakeAll(world);
    run(world, 4);
    const meanX = world.bodies.reduce((sum, b) => sum + b.x, 0) / world.bodies.length;
    expect(meanX).toBeGreaterThan(200);
  });

  it("wakes a sleeping disc that is hit hard", () => {
    const world = createWorld(300, 300);
    const sleeper = createBody(1, 150, 285, 15);
    sleeper.asleep = true;
    const bullet = createBody(2, 60, 285, 15, { vx: 900 });
    world.bodies.push(sleeper, bullet);
    run(world, 0.2);
    expect(sleeper.x).toBeGreaterThan(151);
  });

  it("settles instantly to a resting place for reduced motion", () => {
    const world = createWorld(300, 200);
    const body = createBody(1, 150, 20, 15, { vx: 50 });
    world.bodies.push(body);
    settle(world);
    expect(body.asleep).toBe(true);
    expect(body.y).toBeCloseTo(185, 0);
  });

  it("puts discs to sleep where they are when settling runs out of time", () => {
    const world = createWorld(300, 200);
    const body = createBody(1, 150, 20, 15);
    world.bodies.push(body);
    settle(world, 0.05);
    expect(body.asleep).toBe(true);
    expect(body.vy).toBe(0);
  });

  it("lifts a disc dropped inside the pile onto it", () => {
    const world = createWorld(300, 200);
    const resting = createBody(1, 150, 185, 15);
    world.bodies.push(resting);
    const dropped = createBody(2, 152, 180, 15);
    placeFree(world, dropped);
    expect(Math.hypot(dropped.x - resting.x, dropped.y - resting.y)).toBeGreaterThanOrEqual(30);
    expect(dropped.y).toBeLessThan(resting.y);
  });

  it("gives up lifting at the top of a full box", () => {
    const world = createWorld(40, 40);
    const resting = createBody(1, 20, 20, 15);
    world.bodies.push(resting);
    const dropped = createBody(2, 20, 22, 15);
    placeFree(world, dropped);
    expect(dropped.y).toBe(15);
  });

  it("contains discs in a box that shrank, and centres them in one too small", () => {
    const world = createWorld(100, 100);
    const body = createBody(1, 400, -20, 10);
    contain(world, body);
    expect([body.x, body.y]).toEqual([90, 10]);
    const tiny = createWorld(10, 10);
    contain(tiny, body);
    expect([body.x, body.y]).toEqual([5, 5]);
  });

  it("clamps a long frame and simulates no time for a negative one", () => {
    const world = createWorld(300, 2000);
    const body = createBody(1, 150, 20, 15);
    world.bodies.push(body);
    step(world, 10);
    expect(body.y).toBeLessThan(20 + 2000 * PHYSICS.maxFrame ** 2);
    const y = body.y;
    step(world, -1);
    expect(body.y).toBeGreaterThanOrEqual(y);
  });
});
