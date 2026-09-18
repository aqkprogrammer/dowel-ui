import { describe, expect, it } from "vitest";

import {
  CARD_SPREAD_LAYOUTS,
  getCardSpreadDefaults,
  getCardSpreadOrigin,
  getCardSpreadPose,
  type CardSpreadLayout,
  type CardSpreadPose,
} from "./card-spread-layouts";

/** Card size amicro drew its pixel coordinates against. */
const W = 128;
const H = 176;

function poses(layout: CardSpreadLayout, count: number, open = true, tuning = {}) {
  return Array.from({ length: count }, (_, i) =>
    getCardSpreadPose(layout, i, count, open, tuning),
  );
}

/** A pose in amicro's pixels, for comparison with its hard-coded values. */
function px(pose: CardSpreadPose) {
  return { x: (pose.x / 100) * W, y: (pose.y / 100) * H, rotate: pose.rotate };
}

function expectNear(actual: number, expected: number, tolerance: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

describe("getCardSpreadPose", () => {
  it.each(CARD_SPREAD_LAYOUTS)(
    "%s: a closed deck is stacked, unrotated and unscaled",
    (layout) => {
      for (const pose of poses(layout, 5, false)) {
        expect(Math.abs(pose.x)).toBe(0);
        expect(Math.abs(pose.rotate)).toBe(0);
        expect(pose.scale).toBe(1);
        if (layout !== "cascade") expect(Math.abs(pose.y)).toBe(0);
      }
    },
  );

  it("closed cascade shows the deck's edges, each card a hair lower", () => {
    const ys = poses("cascade", 5, false).map((pose) => pose.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(ys[0]).toBeLessThan(0);
    expect(ys[4]).toBeGreaterThan(0);
  });

  it.each(["arc", "long-arc", "linear", "stamp", "cascade", "wheel"] as const)(
    "%s: opens symmetrically about the centre card",
    (layout) => {
      const open = poses(layout, 5);
      for (let i = 0; i < 2; i += 1) {
        const [a, b] = [open[i], open[4 - i]] as [CardSpreadPose, CardSpreadPose];
        expect(a.x).toBeCloseTo(-b.x);
        expect(a.rotate).toBeCloseTo(-b.rotate);
        if (layout !== "cascade") expect(a.y).toBeCloseTo(b.y);
      }
    },
  );

  it.each(CARD_SPREAD_LAYOUTS)("%s: works for any count, including one card", (layout) => {
    for (const count of [1, 2, 3, 7, 12]) {
      for (const pose of poses(layout, count)) {
        for (const value of Object.values(pose)) expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it("keeps the centre card on top and scales it up in the arcs", () => {
    const open = poses("arc", 5);
    const z = open.map((pose) => pose.z);
    expect(Math.max(...z)).toBe(z[2]);
    expect(open[2]?.scale).toBe(1.05);
    expect(open[0]?.scale).toBe(1);
  });

  describe("reproduces amicro's coordinates", () => {
    it("ARC (5 Cards): ±30° and ±70 px at the edges, the ends 20 px below the centre", () => {
      const [edge, , centre] = poses("arc", 5).map(px) as [
        ReturnType<typeof px>,
        ReturnType<typeof px>,
        ReturnType<typeof px>,
      ];
      expect(edge.rotate).toBe(-30);
      expectNear(edge.x, -70, 2);
      expectNear(edge.y - centre.y, 20, 1);
    });

    it("ARC (7 Cards) is the same arc with seven children: ±45° and ±110 px", () => {
      const edge = px(poses("arc", 7)[6] as CardSpreadPose);
      expect(edge.rotate).toBe(45);
      expectNear(edge.x, 110, 3);
      expectNear(edge.y, 30, 1);
    });

    it("Long ARC (5 Cards): ±15° and ±140 px", () => {
      const edge = px(poses("long-arc", 5)[4] as CardSpreadPose);
      expect(edge.rotate).toBe(15);
      expectNear(edge.x, 140, 1);
      expectNear(edge.y, 20, 1);
    });

    it("Linear Spread: ±90 px and no rotation", () => {
      const open = poses("linear", 5).map(px);
      expectNear(open[4]?.x ?? 0, 90, 1);
      for (const pose of open) expect(Math.abs(pose.rotate)).toBe(0);
    });

    it("Corner Fan: -10° to +30° about the bottom inline-start corner", () => {
      expect(poses("corner", 5).map((pose) => pose.rotate)).toEqual([-10, 0, 10, 20, 30]);
      expect(poses("corner", 5).map((pose) => pose.z)).toEqual([5, 4, 3, 2, 1]);
      expect(poses("corner", 5)[2]?.scale).toBe(1.03);
      expect(getCardSpreadOrigin("corner")).toEqual({ x: -50, y: 100 });
    });

    it("Stamp Arc: ±25°, ±180 px and a 40 px drop at the defaults", () => {
      const edge = px(poses("stamp", 5)[0] as CardSpreadPose);
      expect(edge.rotate).toBe(-25);
      expectNear(edge.x, -180, 1);
      expectNear(edge.y, 40, 1);
    });

    it("Cascade Stagger Fan: climbs 28 px and steps 14 px per card", () => {
      const open = poses("cascade", 5).map(px);
      expectNear(open[2]?.y ?? 0, -14, 1);
      expectNear((open[3]?.y ?? 0) - (open[2]?.y ?? 0), -28, 1);
      expectNear(open[3]?.x ?? 0, 14, 1);
      expect(open[4]?.rotate).toBe(12);
    });

    it("Scatter Desk Deal: lands on the hand-placed coordinates", () => {
      const expected = [
        { x: -75, y: 15, rotate: -14 },
        { x: -35, y: -15, rotate: -6 },
        { x: 0, y: -30, rotate: 2 },
        { x: 35, y: -10, rotate: 8 },
        { x: 75, y: 20, rotate: 15 },
      ];
      poses("scatter", 5)
        .map(px)
        .forEach((pose, i) => {
          const target = expected[i] ?? { x: 0, y: 0, rotate: 0 };
          expectNear(pose.x, target.x, 3);
          expectNear(pose.y, target.y, 4);
          expectNear(pose.rotate, target.rotate, 1);
        });
    });

    it("Wheel Radial Fan: 18° per card about a hub below the cards", () => {
      const open = poses("wheel", 5).map(px);
      expect(open.map((pose) => pose.rotate)).toEqual([-36, -18, 0, 18, 36]);
      expectNear(open[2]?.y ?? 0, -28, 1);
      expectNear(open[0]?.y ?? 0, -8, 1);
      expect(getCardSpreadOrigin("wheel").y).toBe(110);
    });
  });

  it("tuning overrides one knob and keeps the layout's other defaults", () => {
    const base = poses("stamp", 5)[4] as CardSpreadPose;
    const tuned = getCardSpreadPose("stamp", 4, 5, true, { arc: 40 });
    expect(tuned.rotate).toBe(80);
    expect(tuned.x).toBe(base.x);
    expect(tuned.y).toBe(base.y);

    const flat = getCardSpreadPose("stamp", 4, 5, true, { gap: 10, offset: 0 });
    expect(flat.x).toBe(20);
    expect(Math.abs(flat.y)).toBe(0);
  });

  it("returns copies of its defaults and origins", () => {
    const defaults = getCardSpreadDefaults("arc");
    defaults.arc = 99;
    expect(getCardSpreadDefaults("arc").arc).toBe(15);
    expect(getCardSpreadOrigin("arc")).toEqual({ x: 0, y: 100 });
  });
});
