import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import {
  ageRipples,
  falloff,
  INTERACTIVE_GRID_MAX_CELLS,
  InteractiveGrid,
  layoutInteractiveGrid,
  RIPPLE_LIFE,
  RIPPLE_SPEED,
  rippleAt,
  stepInteractiveGrid,
  type Ripple,
} from "./interactive-grid";

function mockReducedMotion(reduced: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
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

/** Lit cells drawn in the last frame: those filled at less than full opacity. */
function lit(mock: CanvasMock) {
  return mock.calls.filter((call) => call.method === "fillRect" && call.globalAlpha < 1).length;
}

function frame(mock: CanvasMock) {
  mock.reset();
  act(() => void mock.flush(1));
}

describe("InteractiveGrid", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 280, height: 140 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("renders children above an aria-hidden canvas that ignores the pointer", async () => {
    const { container } = render(
      <InteractiveGrid>
        <h2>Build on the grid</h2>
      </InteractiveGrid>,
    );
    const canvas = container.querySelector("[data-slot=interactive-grid-canvas]");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveClass("pointer-events-none");
    expect(container.querySelector("[data-slot=interactive-grid-content]")).toContainElement(
      screen.getByRole("heading", { name: "Build on the grid" }),
    );
    await expectNoA11yViolations(container);
  });

  it("draws every cell at rest, and stops drawing until something moves", () => {
    render(<InteractiveGrid cell={28} />);
    act(() => void mock.flush(1));
    // 280×140 at a 28px pitch is 10×5 cells.
    expect(mock.count("fillRect")).toBe(50);
    expect(mock.pending()).toBe(0);
  });

  it("lights cells around the pointer and lets them fade after it leaves", () => {
    const { container } = render(<InteractiveGrid radius={60} decay={0.99} />);
    const root = container.firstElementChild as HTMLElement;
    act(() => void mock.flush(1));
    fireEvent.pointerMove(root, { clientX: 140, clientY: 70 });
    frame(mock);
    const near = lit(mock);
    expect(near).toBeGreaterThan(0);
    // The lit pass uses the accent colour.
    expect(
      mock.calls.some(
        (call) =>
          call.method === "fillRect" &&
          call.globalAlpha < 1 &&
          call.fillStyle === "var(--color-primary)",
      ),
    ).toBe(true);

    fireEvent.pointerLeave(root);
    act(() => void mock.flush(200));
    frame(mock);
    expect(lit(mock)).toBe(0);
    expect(mock.pending()).toBe(0);
  });

  it("sends a ripple out from a press", () => {
    const { container } = render(<InteractiveGrid />);
    const root = container.firstElementChild as HTMLElement;
    act(() => void mock.flush(1));
    fireEvent.pointerDown(root, { clientX: 20, clientY: 20 });
    act(() => void mock.flush(10));
    frame(mock);
    expect(lit(mock)).toBeGreaterThan(0);
    expect(mock.pending()).toBe(1);
  });

  it("ignores the pointer when not interactive", () => {
    const { container } = render(<InteractiveGrid interactive={false} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toHaveAttribute("data-interactive");
    act(() => void mock.flush(1));
    fireEvent.pointerMove(root, { clientX: 140, clientY: 70 });
    fireEvent.pointerDown(root, { clientX: 140, clientY: 70 });
    act(() => void mock.flush(3));
    frame(mock);
    expect(lit(mock)).toBe(0);
  });

  it("under reduced motion, follows the pointer with no trail and no ripples", () => {
    mockReducedMotion(true);
    const { container } = render(<InteractiveGrid radius={60} />);
    const root = container.firstElementChild as HTMLElement;
    act(() => void mock.flush(1));
    fireEvent.pointerDown(root, { clientX: 20, clientY: 20 });
    fireEvent.pointerMove(root, { clientX: 140, clientY: 70 });
    frame(mock);
    expect(lit(mock)).toBeGreaterThan(0);
    fireEvent.pointerLeave(root);
    frame(mock);
    // Gone at once: no fading trail.
    expect(lit(mock)).toBe(0);
  });

  it("keeps a loop running in idle mode and starts ripples by itself", () => {
    render(<InteractiveGrid idle />);
    let rippled = false;
    for (let i = 0; i < 400 && !rippled; i += 1) {
      frame(mock);
      rippled = lit(mock) > 0;
    }
    expect(rippled).toBe(true);
  });

  it("draws dots when asked", () => {
    render(<InteractiveGrid shape="dot" />);
    act(() => void mock.flush(1));
    expect(mock.count("arc")).toBe(50);
    expect(mock.count("fillRect")).toBe(0);
  });

  it("lets className win, forwards its ref and applies fades", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <InteractiveGrid ref={ref} fade="edges" className="isolation-auto" data-testid="grid" />,
    );
    expect(ref.current).toBe(screen.getByTestId("grid"));
    expect(ref.current?.className).toContain("mask-image:radial-gradient");
    expect(ref.current).toHaveClass("isolation-auto");
    expect(ref.current).not.toHaveClass("isolate");
  });
});

describe("interactive-grid sim", () => {
  it("centres the grid and caps the number of cells", () => {
    const small = layoutInteractiveGrid(280, 140, 28);
    expect(small).toMatchObject({ cols: 10, rows: 5, pitch: 28 });
    expect(small.offsetX).toBeCloseTo((280 - 9 * 28) / 2);
    const huge = layoutInteractiveGrid(4000, 3000, 10);
    expect(huge.cols * huge.rows).toBeLessThanOrEqual(INTERACTIVE_GRID_MAX_CELLS * 1.05);
    expect(layoutInteractiveGrid(0, 100, 20)).toMatchObject({ cols: 0, rows: 0 });
  });

  it("falls off smoothly to nothing at the radius", () => {
    expect(falloff(0, 100)).toBe(1);
    expect(falloff(50, 100)).toBeCloseTo(0.5);
    expect(falloff(100, 100)).toBe(0);
    expect(falloff(10, 0)).toBe(0);
  });

  it("moves a ripple's ring outward and fades it", () => {
    const ripple: Ripple = { x: 0, y: 0, age: 0.5, strength: 1 };
    const ring = 0.5 * RIPPLE_SPEED;
    expect(rippleAt(ripple, ring)).toBeGreaterThan(0.5);
    expect(rippleAt(ripple, ring + 200)).toBe(0);
    expect(rippleAt({ ...ripple, age: RIPPLE_LIFE }, ring)).toBe(0);
  });

  it("raises cells to their target, drains them, and reports rest", () => {
    const layout = layoutInteractiveGrid(100, 100, 50);
    const energy = new Float32Array(layout.cols * layout.rows);
    const options = { radius: 60, ripples: [], decay: 0.9, delta: 1 / 60, instant: false };
    expect(stepInteractiveGrid(energy, layout, { ...options, pointer: { x: 25, y: 25 } })).toBe(
      true,
    );
    expect(energy[0]).toBeCloseTo(1);
    const lit = energy[0] ?? 0;
    stepInteractiveGrid(energy, layout, { ...options, pointer: null });
    expect(energy[0]).toBeLessThan(lit);
    for (let i = 0; i < 600; i += 1)
      stepInteractiveGrid(energy, layout, { ...options, pointer: null });
    expect(stepInteractiveGrid(energy, layout, { ...options, pointer: null })).toBe(false);
    expect([...energy].every((value) => value === 0)).toBe(true);
  });

  it("drops to nothing at once when instant", () => {
    const layout = layoutInteractiveGrid(100, 100, 50);
    const energy = new Float32Array(layout.cols * layout.rows).fill(1);
    const alive = stepInteractiveGrid(energy, layout, {
      pointer: null,
      radius: 60,
      ripples: [],
      decay: 0.5,
      delta: 1 / 60,
      instant: true,
    });
    expect(alive).toBe(false);
  });

  it("ages ripples in place and drops the finished ones", () => {
    const ripples: Ripple[] = [
      { x: 0, y: 0, age: 0, strength: 1 },
      { x: 0, y: 0, age: RIPPLE_LIFE - 0.01, strength: 1 },
    ];
    const same = ripples;
    ageRipples(ripples, 0.1);
    expect(ripples).toBe(same);
    expect(ripples).toHaveLength(1);
    expect(ripples[0]?.age).toBeCloseTo(0.1);
  });
});
