import { describe, expect, it } from "vitest";

import {
  createHoleParticles,
  createHoleRandom,
  holeGeometry,
  holeParticleAlpha,
  holeParticleCount,
  holeParticleVelocity,
  holePoint,
  holeRing,
  holeRings,
  stepHoleParticles,
  type HoleParticle,
} from "./hole-background-sim";

const PARTICLE: HoleParticle = { angle: 0, s: 0.5, speed: 1, size: 1 };

describe("holeGeometry", () => {
  it("centres the vanishing point and reaches the corners", () => {
    const geometry = holeGeometry(800, 600);
    expect(geometry).toMatchObject({ centerX: 400, centerY: 300, pointX: 400, pointY: 300 });
    expect(geometry.reach).toBeGreaterThan(500);
    expect(geometry.aspect).toBe(0.55);
    expect(holeGeometry(800, 600, "tunnel").aspect).toBe(1);
  });

  it("leans the vanishing point, clamped to a third of the box", () => {
    const geometry = holeGeometry(800, 600, "well", { x: 1, y: -0.5 });
    expect(geometry.pointX).toBeCloseTo(400 + 800 * 0.32);
    expect(geometry.pointY).toBeCloseTo(300 - 300 * 0.32);
    expect(holeGeometry(800, 600, "well", { x: 9, y: -9 })).toMatchObject({
      pointX: 400 + 800 * 0.32,
      pointY: 300 - 600 * 0.32,
    });
  });
});

describe("holeRing and holePoint", () => {
  it("slides ring centres from the vanishing point to the box centre with depth", () => {
    const geometry = holeGeometry(800, 600, "tunnel", { x: 1, y: 0 });
    expect(holeRing(geometry, 0)).toMatchObject({ x: geometry.pointX, rx: 0, ry: 0 });
    expect(holeRing(geometry, 1)).toMatchObject({ x: 400, y: 300, rx: geometry.reach });
    expect(holeRing(geometry, 0.5).x).toBeCloseTo((geometry.pointX + 400) / 2);
  });

  it("squashes rings vertically for a well", () => {
    const geometry = holeGeometry(800, 600, "well");
    const right = holePoint(geometry, 1, 0);
    const bottom = holePoint(geometry, 1, Math.PI / 2);
    expect(right.x - 400).toBeCloseTo(geometry.reach);
    expect(bottom.y - 300).toBeCloseTo(geometry.reach * 0.55);
  });
});

describe("holeRings", () => {
  it("crowds rings toward the centre and fades both ends", () => {
    const rings = holeRings(10, 0);
    expect(rings).toHaveLength(10);
    expect(rings.map((ring) => ring.s)).toEqual([...rings.map((ring) => ring.s)].sort());
    const gaps = rings.slice(1).map((ring, i) => ring.s - (rings[i]?.s ?? 0));
    expect(gaps[0]).toBeLessThan(gaps.at(-1) ?? 0);
    expect(rings[0]?.alpha).toBe(0);
    expect(Math.max(...rings.map((ring) => ring.alpha))).toBe(1);
  });

  it("flows inward as the offset grows, and repeats every full cycle", () => {
    const start = holeRings(8, 0);
    const later = holeRings(8, 0.01);
    // Every ring has moved in; the outermost is a new one, just born at the rim.
    later.slice(0, -1).forEach((ring, i) => {
      expect(ring.s).toBeGreaterThan(start[i]?.s ?? 1);
      expect(ring.s).toBeLessThan(start[i + 1]?.s ?? 0);
    });
    expect(later.at(-1)?.alpha).toBeLessThan(0.01);
    expect(holeRings(8, 8).map((ring) => ring.s)).toEqual(start.map((ring) => ring.s));
    expect(holeRings(0, 1)).toEqual([]);
  });
});

describe("particles", () => {
  it("counts by area and density, capped", () => {
    expect(holeParticleCount(500, 500, 1)).toBe(100);
    expect(holeParticleCount(5000, 5000, 1)).toBe(500);
    expect(holeParticleCount(500, 0, 1)).toBe(0);
    expect(holeParticleCount(500, 500, 0)).toBe(0);
  });

  it("are deterministic for a seed and start inside the tunnel", () => {
    const particles = createHoleParticles(60, 4);
    expect(particles).toEqual(createHoleParticles(60, 4));
    expect(particles).not.toEqual(createHoleParticles(60, 5));
    for (const p of particles) {
      expect(p.s).toBeGreaterThanOrEqual(0.05);
      expect(p.s).toBeLessThanOrEqual(1.02);
    }
  });

  it("fall inward and swirl faster as they near the centre", () => {
    const rim = holeParticleVelocity({ ...PARTICLE, s: 1 });
    const core = holeParticleVelocity({ ...PARTICLE, s: 0.1 });
    expect(rim.ds).toBeLessThan(0);
    expect(core.ds).toBeLessThan(rim.ds);
    expect(core.dAngle).toBeGreaterThan(rim.dAngle);
    expect(holeParticleVelocity(PARTICLE, 2).ds).toBeCloseTo(
      holeParticleVelocity(PARTICLE).ds * 2,
    );
  });

  it("step inward and respawn at the rim when they reach the core", () => {
    const random = createHoleRandom(2);
    const particles: HoleParticle[] = [{ ...PARTICLE }, { ...PARTICLE, s: 0.03 }];
    stepHoleParticles(particles, 0.1, 1, random);
    expect(particles[0]?.s).toBeLessThan(0.5);
    expect(particles[0]?.angle).toBeGreaterThan(0);
    expect(particles[1]?.s).toBeGreaterThanOrEqual(1);
    const before = particles.map((p) => ({ ...p }));
    stepHoleParticles(particles, 0);
    expect(particles).toEqual(before);
  });

  it("every particle eventually falls through and comes back", () => {
    const particles = createHoleParticles(30, 1);
    const random = createHoleRandom(1);
    let respawned = 0;
    for (let i = 0; i < 60 * 12; i += 1) {
      const depths = particles.map((p) => p.s);
      stepHoleParticles(particles, 1 / 60, 1, random);
      particles.forEach((p, index) => {
        if (p.s > (depths[index] ?? 0)) respawned += 1;
      });
    }
    expect(respawned).toBeGreaterThanOrEqual(30);
  });

  it("fade in past the rim and out into the core", () => {
    expect(holeParticleAlpha({ ...PARTICLE, s: 0.5 })).toBe(1);
    expect(holeParticleAlpha({ ...PARTICLE, s: 0.02 })).toBe(0);
    expect(holeParticleAlpha({ ...PARTICLE, s: 1.06 })).toBe(0);
    expect(holeParticleAlpha({ ...PARTICLE, s: 0.08 })).toBeGreaterThan(0);
    expect(holeParticleAlpha({ ...PARTICLE, s: 0.08 })).toBeLessThan(1);
  });
});
