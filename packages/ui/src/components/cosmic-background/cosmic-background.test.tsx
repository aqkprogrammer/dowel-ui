import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { CosmicBackground } from "./cosmic-background";
import {
  COSMIC_BACKGROUND_ORBITS,
  cosmicBackgroundOrbitAngle,
  cosmicBackgroundOrbitPoint,
  cosmicBackgroundScale,
  cosmicBackgroundStarCount,
  cosmicBackgroundTwinkle,
  createCosmicBackgroundStars,
  type CosmicOrbit,
} from "./cosmic-background-sim";

function mockReducedMotion(reduced: boolean) {
  return vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduced && query.includes("reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

/** Every arc of the last frame, as [x, y, radius]. */
function arcs(mock: CanvasMock) {
  return mock.calls
    .filter((call) => call.method === "arc")
    .map((call) => call.args.slice(0, 3) as number[]);
}

/** Runs the engine to a settled first frame, then records exactly one frame. */
function frame(mock: CanvasMock) {
  mock.reset();
  act(() => void mock.flush(1));
}

/** A frame with no stars, so every arc is the core or a body. */
const NO_STARS = { density: 0 } as const;

describe("CosmicBackground", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 600, height: 300 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("renders its children above an aria-hidden scene that ignores the pointer", async () => {
    const { container } = render(
      <CosmicBackground>
        <h2>Ship from orbit</h2>
      </CosmicBackground>,
    );
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-slot", "cosmic-background");
    expect(root).toHaveAttribute("data-interactive", "true");
    expect(root).toHaveClass("relative", "isolate", "overflow-hidden");
    const scene = container.querySelector("[data-slot=cosmic-background-scene]");
    expect(scene).toHaveAttribute("aria-hidden", "true");
    expect(scene).toHaveClass("pointer-events-none", "absolute", "inset-0");
    expect(scene).toContainElement(container.querySelector("canvas"));
    const content = container.querySelector("[data-slot=cosmic-background-content]");
    expect(content).toHaveClass("relative", "z-10");
    expect(content).toContainElement(screen.getByRole("heading", { name: "Ship from orbit" }));
    await expectNoA11yViolations(container);
  });

  it("draws a star field scaled by density", () => {
    const { rerender } = render(<CosmicBackground orbits={0} core={false} speed={0} />);
    act(() => void mock.flush(2));
    frame(mock);
    const sparse = mock.count("arc") + mock.count("fillRect");
    // 600×300 at density 1 is 75 stars.
    expect(sparse).toBe(75);
    rerender(<CosmicBackground orbits={0} core={false} speed={0} density={2} />);
    act(() => void mock.flush(1));
    frame(mock);
    expect(mock.count("arc") + mock.count("fillRect")).toBe(150);
  });

  it("draws one ring and one body per orbit, clamped to three", () => {
    const { rerender } = render(<CosmicBackground {...NO_STARS} core={false} speed={0} />);
    act(() => void mock.flush(2));
    frame(mock);
    expect(mock.count("ellipse")).toBe(2);
    // Each body is a seven-dot trail, a halo and the body itself.
    expect(mock.count("arc")).toBe(2 * 9);

    rerender(<CosmicBackground {...NO_STARS} core={false} speed={0} orbits={9} />);
    act(() => void mock.flush(1));
    frame(mock);
    expect(mock.count("ellipse")).toBe(3);
    expect(mock.count("arc")).toBe(3 * 9);

    rerender(<CosmicBackground {...NO_STARS} core={false} speed={0} orbits={0} />);
    act(() => void mock.flush(1));
    frame(mock);
    expect(mock.count("ellipse")).toBe(0);
    expect(mock.count("arc")).toBe(0);
  });

  it("leaves the rings and the core out when asked", () => {
    const { rerender } = render(<CosmicBackground {...NO_STARS} speed={0} />);
    act(() => void mock.flush(2));
    frame(mock);
    const withCore = mock.count("arc");
    rerender(<CosmicBackground {...NO_STARS} speed={0} core={false} rings={false} />);
    act(() => void mock.flush(1));
    frame(mock);
    expect(mock.count("ellipse")).toBe(0);
    // The core is three halo discs and the bright centre.
    expect(withCore - mock.count("arc")).toBe(4);
  });

  it("colours the bodies from the palette, cycling it, and the core from its first entry", () => {
    render(
      <CosmicBackground {...NO_STARS} speed={0} orbits={3} palette={["info", "success"]} />,
    );
    act(() => void mock.flush(2));
    frame(mock);
    const fills = new Set(
      mock.calls.filter((call) => call.method === "fill").map((call) => call.fillStyle),
    );
    expect(fills).toEqual(new Set(["var(--color-info)", "var(--color-success)"]));
  });

  it("moves the bodies while animating, and parks them at speed 0", () => {
    const { rerender } = render(<CosmicBackground {...NO_STARS} interactive={false} />);
    act(() => void mock.flush(2));
    frame(mock);
    const before = arcs(mock);
    act(() => void mock.flush(60));
    frame(mock);
    expect(arcs(mock)).not.toEqual(before);

    rerender(<CosmicBackground {...NO_STARS} interactive={false} speed={0} />);
    act(() => void mock.flush(1));
    frame(mock);
    const parked = arcs(mock);
    act(() => void mock.flush(60));
    frame(mock);
    expect(arcs(mock)).toEqual(parked);
  });

  it("keeps the same sky for a seed and changes it with another", () => {
    const { rerender } = render(
      <CosmicBackground seed={3} orbits={0} core={false} speed={0} />,
    );
    act(() => void mock.flush(1));
    frame(mock);
    const first = arcs(mock);
    rerender(<CosmicBackground seed={3} orbits={0} core={false} speed={0} />);
    frame(mock);
    expect(arcs(mock)).toEqual(first);
    rerender(<CosmicBackground seed={4} orbits={0} core={false} speed={0} />);
    frame(mock);
    expect(arcs(mock)).not.toEqual(first);
  });

  it("leans toward the pointer with interactive, and settles back when it leaves", () => {
    const onPointerMove = vi.fn();
    const onPointerLeave = vi.fn();
    const { container } = render(
      <CosmicBackground
        {...NO_STARS}
        speed={0}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    act(() => void mock.flush(1));
    frame(mock);
    const rest = arcs(mock).at(-1) ?? [];
    fireEvent.pointerMove(root, { clientX: 600, clientY: 150 });
    expect(onPointerMove).toHaveBeenCalled();
    act(() => void mock.flush(120));
    frame(mock);
    const leaning = arcs(mock).at(-1) ?? [];
    expect((leaning[0] ?? 0) - (rest[0] ?? 0)).toBeGreaterThan(1);

    fireEvent.pointerLeave(root);
    expect(onPointerLeave).toHaveBeenCalled();
    act(() => void mock.flush(400));
    frame(mock);
    expect(arcs(mock).at(-1)?.[0]).toBeCloseTo(rest[0] ?? 0, 0);
  });

  it("ignores the pointer when not interactive", () => {
    const { container } = render(
      <CosmicBackground {...NO_STARS} speed={0} interactive={false} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toHaveAttribute("data-interactive");
    act(() => void mock.flush(1));
    frame(mock);
    const rest = arcs(mock);
    fireEvent.pointerMove(root, { clientX: 600, clientY: 300 });
    act(() => void mock.flush(60));
    frame(mock);
    expect(arcs(mock)).toEqual(rest);
  });

  it("draws one still frame under reduced motion, without parallax", () => {
    mockReducedMotion(true);
    const { container } = render(<CosmicBackground />);
    act(() => void mock.flush(5));
    const drawn = mock.count("clearRect");
    expect(drawn).toBeGreaterThan(0);
    fireEvent.pointerMove(container.firstElementChild as HTMLElement, {
      clientX: 10,
      clientY: 10,
    });
    act(() => void mock.flush(100));
    expect(mock.count("clearRect")).toBe(drawn);
    expect(mock.pending()).toBe(0);
  });

  it("sets the glow strength, clamped, and places the glow at the origin", () => {
    const { container, rerender } = render(<CosmicBackground />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--cosmic-background-glow")).toBe("0.7");
    expect(root.style.getPropertyValue("--cosmic-background-x")).toBe("50%");
    expect(root.style.getPropertyValue("--cosmic-background-accent")).toBe(
      "var(--color-primary)",
    );
    rerender(<CosmicBackground glow={4} origin="top" palette={["#123456"]} />);
    expect(root.style.getPropertyValue("--cosmic-background-glow")).toBe("1");
    expect(root.style.getPropertyValue("--cosmic-background-y")).toBe("22%");
    expect(root.style.getPropertyValue("--cosmic-background-accent")).toBe("#123456");
    expect(root.style.getPropertyValue("--cosmic-background-accent-2")).toBe("#123456");
    rerender(<CosmicBackground glow={-1} />);
    expect(root.style.getPropertyValue("--cosmic-background-glow")).toBe("0");
  });

  it("applies the fade variants and lets className win a conflict", () => {
    const { container, rerender } = render(
      <CosmicBackground fade="edges" className="isolation-auto" />,
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("mask-image:radial-gradient");
    expect(root).toHaveClass("isolation-auto");
    expect(root).not.toHaveClass("isolate");
    rerender(<CosmicBackground fade="bottom" />);
    expect(root?.className).toContain("mask-image:linear-gradient");
    rerender(<CosmicBackground fade="none" />);
    expect(root?.className).not.toContain("mask-image");
  });

  it("forwards its ref, spreads props and merges style", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <CosmicBackground
        ref={ref}
        id="sky"
        data-testid="sky"
        title="Orbit"
        style={{ minHeight: 240 }}
      />,
    );
    expect(ref.current).toBe(screen.getByTestId("sky"));
    expect(ref.current).toHaveAttribute("id", "sky");
    expect(ref.current).toHaveAttribute("title", "Orbit");
    expect(ref.current?.style.minHeight).toBe("240px");
    expect(ref.current?.style.getPropertyValue("--cosmic-background-glow")).toBe("0.7");
  });
});

describe("cosmic-background sim", () => {
  it("scales the star count with area and density, and caps it", () => {
    expect(cosmicBackgroundStarCount(600, 300, 1)).toBe(75);
    expect(cosmicBackgroundStarCount(600, 300, 0.5)).toBe(38);
    expect(cosmicBackgroundStarCount(4000, 3000, 2)).toBe(900);
    expect(cosmicBackgroundStarCount(0, 300, 1)).toBe(0);
    expect(cosmicBackgroundStarCount(600, 300, -1)).toBe(0);
  });

  it("lays out the same stars for a seed, inside the box, crowding toward the top", () => {
    const stars = createCosmicBackgroundStars(400, 9, 2);
    expect(createCosmicBackgroundStars(400, 9, 2)).toEqual(stars);
    expect(createCosmicBackgroundStars(400, 10, 2)).not.toEqual(stars);
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThan(1);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThan(1);
      expect(star.tint).toBeGreaterThanOrEqual(-1);
      expect(star.tint).toBeLessThan(2);
    }
    const upper = stars.filter((star) => star.y < 0.5).length;
    expect(upper).toBeGreaterThan(stars.length / 2);
    // Some stars carry an accent, most do not.
    const tinted = stars.filter((star) => star.tint >= 0).length;
    expect(tinted).toBeGreaterThan(0);
    expect(tinted).toBeLessThan(stars.length / 2);
    // No palette, no tints.
    expect(createCosmicBackgroundStars(50, 9, 0).every((star) => star.tint === -1)).toBe(true);
  });

  it("twinkles each star between 45% and 100% of its brightness", () => {
    const [star] = createCosmicBackgroundStars(1, 2, 0);
    if (!star) throw new Error("no star");
    for (let t = 0; t < 20; t += 0.37) {
      const alpha = cosmicBackgroundTwinkle(star, t);
      expect(alpha).toBeGreaterThanOrEqual(star.brightness * 0.45 - 1e-9);
      expect(alpha).toBeLessThanOrEqual(star.brightness + 1e-9);
    }
  });

  it("turns each body once per period, in its own direction, and not at all at speed 0", () => {
    const [outer, inner] = COSMIC_BACKGROUND_ORBITS;
    if (!outer || !inner) throw new Error("no orbits");
    expect(cosmicBackgroundOrbitAngle(outer, outer.period, 1) - outer.start).toBeCloseTo(
      Math.PI * 2,
    );
    expect(cosmicBackgroundOrbitAngle(inner, inner.period, 1) - inner.start).toBeCloseTo(
      -Math.PI * 2,
    );
    expect(cosmicBackgroundOrbitAngle(outer, 10, 0)).toBe(outer.start);
    expect(cosmicBackgroundOrbitAngle({ ...outer, period: 0 }, 10, 1)).toBe(outer.start);
  });

  it("places a body on its tilted ellipse, nearest at the bottom of the orbit", () => {
    const flat: CosmicOrbit = {
      rx: 1,
      ratio: 0.5,
      tilt: 0,
      period: 10,
      direction: 1,
      start: 0,
      body: 2,
    };
    const right = cosmicBackgroundOrbitPoint(flat, 0, 100, 50, 40);
    expect(right.x).toBeCloseTo(140);
    expect(right.y).toBeCloseTo(50);
    expect(right.near).toBeCloseTo(0.5);
    const bottom = cosmicBackgroundOrbitPoint(flat, Math.PI / 2, 100, 50, 40);
    expect(bottom.x).toBeCloseTo(100);
    expect(bottom.y).toBeCloseTo(70);
    expect(bottom.near).toBeCloseTo(1);

    const tilted = cosmicBackgroundOrbitPoint({ ...flat, tilt: Math.PI / 2 }, 0, 0, 0, 10);
    expect(tilted.x).toBeCloseTo(0);
    expect(tilted.y).toBeCloseTo(10);

    // Reuses the point it is given.
    const out = { x: 0, y: 0, near: 0 };
    expect(cosmicBackgroundOrbitPoint(flat, 0, 0, 0, 1, out)).toBe(out);
  });

  it("sizes the orbits to the box", () => {
    expect(cosmicBackgroundScale(600, 300)).toBeCloseTo(216);
    expect(cosmicBackgroundScale(300, 600)).toBeCloseTo(126);
    expect(cosmicBackgroundScale(1600, 200)).toBeCloseTo(180);
    expect(cosmicBackgroundScale(0, 0)).toBe(0);
  });
});
