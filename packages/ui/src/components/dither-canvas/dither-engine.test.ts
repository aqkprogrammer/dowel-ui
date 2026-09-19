import { vi, afterEach, beforeEach, describe, expect, it } from "vitest";

import { installCanvasMock, type CanvasMock } from "./canvas-mock";
import {
  cellSquare,
  clamp,
  createSpring,
  createSprings,
  DITHER_PALETTE,
  ditherFill,
  drift,
  forEachCell,
  hash2,
  lerp,
  resample,
  resolveColor,
  seriesColor,
  shimmer,
  smoothstep,
  tokenToCss,
} from "./dither-engine";
import {
  angleInWedge,
  makePath,
  monotoneTangents,
  niceMax,
  normalizeAngle,
  pieWedges,
  traceRoundedRect,
  traceRoundedWedge,
  tracePolyline,
  traceSpline,
  traceWedge,
  valueAt,
  wedgeAt,
  type PathSink,
} from "./dither-geometry";

function recorder() {
  const commands: { method: string; args: number[] }[] = [];
  const sink = new Proxy({} as PathSink, {
    get:
      (_, method: string) =>
      (...args: number[]) => {
        commands.push({ method, args });
      },
  });
  return { sink, commands, methods: () => commands.map((command) => command.method) };
}

describe("dither engine: density helpers", () => {
  it("clamps, interpolates and smoothsteps", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(smoothstep(0, 1, 0.25)).toBeCloseTo(0.15625);
    expect(smoothstep(1, 1, 0.5)).toBe(0);
    expect(smoothstep(1, 1, 2)).toBe(1);
  });

  it("hashes cells deterministically into [0, 1)", () => {
    expect(hash2(12.3, 45.6)).toBe(hash2(12.3, 45.6));
    expect(hash2(12.3, 45.6)).not.toBe(hash2(45.6, 12.3));
    expect(hash2(12.3, 45.6, 1)).not.toBe(hash2(12.3, 45.6, 2));
    let sum = 0;
    for (let x = 0; x < 50; x++) {
      for (let y = 0; y < 50; y++) {
        const h = hash2(x * 4.6, y * 4.6);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(1);
        sum += h;
      }
    }
    // Roughly uniform: the mean of 2,500 samples sits near a half.
    expect(sum / 2500).toBeGreaterThan(0.45);
    expect(sum / 2500).toBeLessThan(0.55);
  });

  it("eases a sum of sines into 0..1, neutral with no waves", () => {
    expect(shimmer()).toBe(0.5);
    expect(shimmer(1, 1)).toBe(1);
    expect(shimmer(-1, -1)).toBe(0);
    const value = drift(10, 20, 3);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });

  it("centres a square in its cell, sized by density", () => {
    expect(cellSquare(0, 0, 4, 0.5)).toEqual([1, 1, 2]);
    expect(cellSquare(0, 0, 4, 3)).toEqual([0, 0, 4]);
    expect(cellSquare(0, 0, 4, 0)).toBeNull();
  });

  it("visits cells on a grid anchored at the origin", () => {
    const visited: [number, number][] = [];
    forEachCell({ x: 5, y: 5, width: 10, height: 4 }, 4, (x, y) => visited.push([x, y]));
    expect(visited[0]).toEqual([4, 4]);
    expect(visited).toHaveLength(6);
    forEachCell({ x: 0, y: 0, width: 0, height: 4 }, 4, () => {
      throw new Error("empty bounds visit nothing");
    });
  });
});

describe("dither engine: ditherFill", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock();
  });
  afterEach(() => {
    mock.restore();
  });

  it("draws one square per cell with density, clipped, in its colour", () => {
    const clip = makePath((sink) => {
      sink.moveTo(0, 0);
    });
    mock.ctx.globalAlpha = 0.5;
    const drawn = ditherFill(mock.ctx, {
      bounds: { x: 0, y: 0, width: 20, height: 10 },
      cell: 5,
      clip,
      color: "token-colour",
      alpha: 0.5,
      density: (cx) => (cx < 10 ? 1 : 0),
    });
    expect(drawn).toBe(4);
    const rects = mock.calls.filter((call) => call.method === "fillRect");
    expect(rects).toHaveLength(4);
    expect(rects[0]?.args).toEqual([0, 0, 5, 5]);
    expect(rects[0]?.fillStyle).toBe("token-colour");
    expect(rects[0]?.globalAlpha).toBe(0.25);
    expect(mock.count("clip")).toBe(1);
    // Restored: the fill's alpha and colour do not leak.
    expect(mock.ctx.globalAlpha).toBe(0.5);
    expect(mock.calls.at(-1)?.method).toBe("restore");
  });

  it("uses the default cell and keeps the current fillStyle when no colour is given", () => {
    mock.ctx.fillStyle = "kept";
    ditherFill(mock.ctx, { bounds: { x: 0, y: 0, width: 4.6, height: 4.6 }, density: () => 1 });
    const rect = mock.calls.find((call) => call.method === "fillRect");
    expect(rect?.args[2]).toBeCloseTo(4.6);
    expect(rect?.fillStyle).toBe("kept");
    expect(mock.count("clip")).toBe(0);
  });
});

describe("dither engine: colour", () => {
  it("maps token names to custom properties", () => {
    expect(tokenToCss("primary")).toBe("var(--color-primary)");
    expect(tokenToCss("muted-foreground")).toBe("var(--color-muted-foreground)");
    expect(tokenToCss("--color-primary")).toBe("var(--color-primary)");
    expect(tokenToCss("currentcolor")).toBe("currentcolor");
    expect(tokenToCss("color-mix(in oklab, var(--color-primary) 50%, transparent)")).toContain(
      "color-mix",
    );
  });

  it("resolves a token through the element's styles and cleans up its probe", () => {
    const host = document.createElement("div");
    const canvas = document.createElement("canvas");
    host.appendChild(canvas);
    document.body.appendChild(host);
    host.style.setProperty("--color-primary", "blue");
    const spy = vi.spyOn(window, "getComputedStyle");
    const resolved = resolveColor(canvas, "primary");
    expect(resolved.length).toBeGreaterThan(0);
    expect(spy).toHaveBeenCalled();
    expect(host.children).toHaveLength(1);
    spy.mockRestore();
    host.remove();
  });

  it("uses the computed colour when the browser resolves one", () => {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const spy = vi.spyOn(window, "getComputedStyle").mockReturnValue({
      color: "resolved-colour",
      getPropertyValue: () => "",
    } as unknown as CSSStyleDeclaration);
    expect(resolveColor(canvas, "primary")).toBe("resolved-colour");
    spy.mockReturnValue({
      color: "",
      getPropertyValue: () => " raw-value ",
    } as unknown as CSSStyleDeclaration);
    expect(resolveColor(canvas, "primary")).toBe("raw-value");
    spy.mockReturnValue({
      color: "",
      getPropertyValue: () => "",
    } as unknown as CSSStyleDeclaration);
    expect(resolveColor(canvas, "currentcolor")).toBe("currentcolor");
    spy.mockRestore();
    canvas.remove();
  });

  it("cycles the palette in order and prefers a series' own colour", () => {
    expect(seriesColor(0)).toBe("primary");
    expect(seriesColor(DITHER_PALETTE.length)).toBe("primary");
    expect(seriesColor(1)).toContain("color-mix");
    expect(seriesColor(3, "info")).toBe("info");
  });
});

describe("dither engine: springs", () => {
  it("settles on its target and reports when it stops moving", () => {
    const spring = createSpring(0);
    spring.set(10);
    let steps = 0;
    while (spring.step(1 / 60) && steps < 600) steps++;
    expect(steps).toBeGreaterThan(5);
    expect(spring.value).toBe(10);
    expect(spring.velocity).toBe(0);
    expect(spring.target).toBe(10);
  });

  it("jumps under reduced motion and on jump()", () => {
    const spring = createSpring(0);
    spring.set(5);
    expect(spring.step(1 / 60, true)).toBe(false);
    expect(spring.value).toBe(5);
    spring.jump(2);
    expect(spring.value).toBe(2);
    expect(spring.step(1 / 60)).toBe(false);
  });

  it("survives a long frame without overshooting wildly", () => {
    const spring = createSpring(0);
    spring.set(1);
    spring.step(5);
    expect(Math.abs(spring.value)).toBeLessThan(2);
  });

  it("resamples a list to a new length rather than dropping to zero", () => {
    expect(resample([1, 2, 3], 5)).toEqual([1, 2, 2, 3, 3]);
    expect(resample([], 2)).toEqual([0, 0]);
    expect(resample([4], 0)).toEqual([]);
    expect(resample([7, 8], 1)).toEqual([7]);
    const list = createSprings([1, 3]);
    list.set([2, 2, 2]);
    expect(list.values).toEqual([1, 3, 3]);
    expect(list.step(1 / 60)).toBe(true);
    list.jump([4, 4]);
    expect(list.values).toEqual([4, 4]);
    list.set([6, 6]);
    expect(list.step(1 / 60, true)).toBe(false);
    expect(list.values).toEqual([6, 6]);
  });
});

describe("dither geometry", () => {
  it("splits a circle into wedges with gaps", () => {
    const wedges = pieWedges([1, 1, 2, -3, Number.NaN], { gap: 0.1 });
    expect(wedges.map((wedge) => wedge.share)).toEqual([0.25, 0.25, 0.5, 0, 0]);
    expect(wedges[0]?.start).toBeCloseTo(-Math.PI / 2 + 0.05);
    expect(wedges[0]?.end).toBeCloseTo(-Math.PI / 2 + Math.PI / 2 - 0.05);
    expect(wedges[3]?.end).toBe(wedges[3]?.start);
    expect(pieWedges([0, 0]).every((wedge) => wedge.share === 0)).toBe(true);
  });

  it("hit-tests a point against the wedges", () => {
    const wedges = pieWedges([1, 1]);
    const center = { x: 50, y: 50 };
    // Right of centre: the first wedge (12 o'clock to 6 o'clock, clockwise).
    expect(wedgeAt(wedges, center, 20, 40, { x: 80, y: 50 })).toBe(0);
    expect(wedgeAt(wedges, center, 20, 40, { x: 20, y: 50 })).toBe(1);
    expect(wedgeAt(wedges, center, 20, 40, { x: 50, y: 50 })).toBeNull();
    expect(wedgeAt(wedges, center, 20, 40, { x: 99, y: 50 })).toBeNull();
    expect(wedgeAt(pieWedges([0]), center, 20, 40, { x: 80, y: 50 })).toBeNull();
    expect(angleInWedge(0, 1, 0.5)).toBe(false);
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2);
  });

  it("traces wedges, rounded wedges and rounded rects", () => {
    const plain = recorder();
    traceWedge(plain.sink, { x: 0, y: 0 }, 5, 10, 0, 1);
    expect(plain.methods()).toEqual(["moveTo", "arc", "lineTo", "arc", "closePath"]);
    traceWedge(plain.sink, { x: 0, y: 0 }, 5, 10, 1, 1);
    expect(plain.commands).toHaveLength(5);

    const rounded = recorder();
    traceRoundedWedge(rounded.sink, { x: 0, y: 0 }, 50, 80, 0, 1, 6);
    expect(rounded.methods().filter((method) => method === "arcTo")).toHaveLength(4);
    const square = recorder();
    traceRoundedWedge(square.sink, { x: 0, y: 0 }, 50, 80, 0, 1, 0);
    expect(square.methods()).toEqual(["moveTo", "arc", "lineTo", "arc", "closePath"]);
    const none = recorder();
    traceRoundedWedge(none.sink, { x: 0, y: 0 }, 50, 80, 1, 1, 6);
    expect(none.commands).toHaveLength(0);

    const rect = recorder();
    traceRoundedRect(rect.sink, 0, 0, 20, 40, 6, 2);
    expect(rect.methods().filter((method) => method === "arcTo")).toHaveLength(4);
    expect(rect.commands[0]?.args).toEqual([6, 0]);
    traceRoundedRect(rect.sink, 0, 0, 0, 40, 6);
    expect(rect.methods().filter((method) => method === "moveTo")).toHaveLength(1);
  });

  it("keeps a spline monotone: flat tangents at local extremes", () => {
    const points = [
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
      { x: 30, y: 10 },
      { x: 40, y: 50 },
    ];
    const tangents = monotoneTangents(points);
    expect(tangents[1]).toBe(0);
    expect(tangents[2]).toBe(0);
    expect(tangents[3]).toBe(0);
    expect(monotoneTangents([{ x: 0, y: 0 }])).toEqual([0]);
    expect(
      monotoneTangents([
        { x: 0, y: 0 },
        { x: 0, y: 5 },
      ]),
    ).toEqual([0, 0]);
    // Steep data gets its tangents scaled back (the Fritsch–Carlson circle).
    const steep = monotoneTangents([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 100 },
    ]);
    expect(Math.abs(steep[1] ?? 0)).toBeLessThanOrEqual(3 * 99);

    const spline = recorder();
    traceSpline(spline.sink, points, 60);
    expect(spline.methods()).toEqual([
      "moveTo",
      "bezierCurveTo",
      "bezierCurveTo",
      "bezierCurveTo",
      "bezierCurveTo",
      "lineTo",
      "lineTo",
      "closePath",
    ]);
    const open = recorder();
    traceSpline(open.sink, points);
    expect(open.methods()).not.toContain("closePath");
    traceSpline(open.sink, []);
    expect(open.commands).toHaveLength(5);
  });

  it("traces polylines and interpolates series", () => {
    const line = recorder();
    tracePolyline(
      line.sink,
      [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ],
      10,
    );
    expect(line.methods()).toEqual(["moveTo", "lineTo", "lineTo", "lineTo", "closePath"]);
    tracePolyline(line.sink, []);
    const open = recorder();
    tracePolyline(open.sink, [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ]);
    expect(open.methods()).toEqual(["moveTo", "lineTo"]);
    expect(valueAt([0, 10, 20], 1.5)).toBe(15);
    expect(valueAt([0, 10], 9)).toBe(10);
    expect(valueAt([], 1)).toBe(0);
  });

  it("rounds axis maxima to 1, 2 or 5 × 10ⁿ", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(0.9)).toBe(1);
    expect(niceMax(1.5)).toBe(2);
    expect(niceMax(3.1)).toBe(5);
    expect(niceMax(67_500)).toBe(100_000);
    expect(niceMax(95)).toBe(100);
  });

  it("returns no path where Path2D does not exist", () => {
    const original = (globalThis as { Path2D?: unknown }).Path2D;
    delete (globalThis as { Path2D?: unknown }).Path2D;
    expect(makePath(() => {})).toBeNull();
    (globalThis as { Path2D?: unknown }).Path2D = original;
  });
});
