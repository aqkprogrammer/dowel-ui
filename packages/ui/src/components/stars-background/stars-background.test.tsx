import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { StarsBackground } from "./stars-background";

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

/** Star dots (arcs and tiny squares) drawn in the last frame. */
function dots(mock: CanvasMock) {
  return mock.count("arc") + mock.count("fillRect");
}

/** The x of every arc in the last frame. */
function arcXs(mock: CanvasMock) {
  return mock.calls
    .filter((call) => call.method === "arc")
    .map((call) => call.args[0] as number);
}

describe("StarsBackground", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 400, height: 200 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("renders its children above an aria-hidden canvas", async () => {
    const { container } = render(
      <StarsBackground>
        <h2>Launch night</h2>
      </StarsBackground>,
    );
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-slot", "stars-background");
    expect(root).toHaveClass("relative", "isolate", "overflow-hidden");
    const canvas = container.querySelector("[data-slot=stars-background-canvas]");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveClass("pointer-events-none", "absolute", "inset-0");
    const content = container.querySelector("[data-slot=stars-background-content]");
    expect(content).toHaveClass("relative", "z-10");
    expect(content).toContainElement(screen.getByRole("heading", { name: "Launch night" }));
    await expectNoA11yViolations(container);
  });

  it("draws a star field scaled by density in the token colour", () => {
    const { rerender } = render(<StarsBackground color="primary" shootingStars={false} />);
    act(() => void mock.flush(2));
    mock.reset();
    act(() => void mock.flush(1));
    // 400×200 at density 1 is 50 stars.
    expect(dots(mock)).toBeGreaterThanOrEqual(50);
    const fills = mock.calls.filter(
      (call) => call.method === "fill" || call.method === "fillRect",
    );
    expect(new Set(fills.map((call) => call.fillStyle))).toEqual(
      new Set(["var(--color-primary)"]),
    );
    expect(Math.max(...fills.map((call) => call.globalAlpha))).toBeLessThanOrEqual(1);

    rerender(<StarsBackground color="primary" shootingStars={false} density={3} />);
    act(() => void mock.flush(1));
    mock.reset();
    act(() => void mock.flush(1));
    expect(dots(mock)).toBeGreaterThanOrEqual(150);
  });

  it("keeps the same sky for a seed and changes it with another", () => {
    const { rerender } = render(<StarsBackground seed={4} shootingStars={false} speed={0} />);
    act(() => void mock.flush(1));
    mock.reset();
    act(() => void mock.flush(1));
    const first = arcXs(mock);
    rerender(<StarsBackground seed={5} shootingStars={false} speed={0} />);
    mock.reset();
    act(() => void mock.flush(1));
    expect(arcXs(mock)).not.toEqual(first);
  });

  it("drifts the field while animating", () => {
    render(<StarsBackground shootingStars={false} interactive={false} />);
    act(() => void mock.flush(2));
    mock.reset();
    act(() => void mock.flush(1));
    const before = arcXs(mock);
    act(() => void mock.flush(30));
    mock.reset();
    act(() => void mock.flush(1));
    expect(arcXs(mock)).not.toEqual(before);
  });

  it("sends shooting stars across now and then, and none when turned off", () => {
    const { rerender } = render(<StarsBackground speed={0} shootingStars={false} />);
    act(() => void mock.flush(1));
    mock.reset();
    act(() => void mock.flush(1));
    // Without streaks, only the near stars' glints stroke.
    const glints = mock.count("stroke");
    act(() => void mock.flush(400));
    mock.reset();
    act(() => void mock.flush(1));
    expect(mock.count("stroke")).toBe(glints);

    rerender(<StarsBackground speed={0} />);
    // Six seconds is always long enough for the first streak's ten-segment tail.
    let streaked = false;
    for (let i = 0; i < 400 && !streaked; i += 1) {
      mock.reset();
      act(() => void mock.flush(1));
      streaked = mock.count("stroke") >= glints + 10;
    }
    expect(streaked).toBe(true);
  });

  it("leans toward the pointer with interactive, and settles back when it leaves", () => {
    const onPointerMove = vi.fn();
    const onPointerLeave = vi.fn();
    const { container } = render(
      <StarsBackground
        speed={0}
        shootingStars={false}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    act(() => void mock.flush(1));
    mock.reset();
    act(() => void mock.flush(1));
    const rest = arcXs(mock);
    fireEvent.pointerMove(root, { clientX: 400, clientY: 100 });
    expect(onPointerMove).toHaveBeenCalled();
    act(() => void mock.flush(120));
    mock.reset();
    act(() => void mock.flush(1));
    const leaning = arcXs(mock);
    const shift = (leaning[0] ?? 0) - (rest[0] ?? 0);
    expect(Math.abs(shift)).toBeGreaterThan(1);

    fireEvent.pointerLeave(root);
    expect(onPointerLeave).toHaveBeenCalled();
    act(() => void mock.flush(400));
    mock.reset();
    act(() => void mock.flush(1));
    const settled = arcXs(mock);
    expect(settled[0]).toBeCloseTo(rest[0] ?? 0, 0);
  });

  it("ignores the pointer when not interactive", () => {
    const { container } = render(
      <StarsBackground speed={0} shootingStars={false} interactive={false} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toHaveAttribute("data-interactive");
    act(() => void mock.flush(1));
    mock.reset();
    act(() => void mock.flush(1));
    const rest = arcXs(mock);
    fireEvent.pointerMove(root, { clientX: 400, clientY: 200 });
    act(() => void mock.flush(60));
    mock.reset();
    act(() => void mock.flush(1));
    expect(arcXs(mock)).toEqual(rest);
  });

  it("draws one still frame under reduced motion, without streaks or parallax", () => {
    mockReducedMotion(true);
    const { container } = render(<StarsBackground />);
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

  it("applies the fade variants and lets className win a conflict", () => {
    const { container, rerender } = render(
      <StarsBackground fade="edges" className="isolation-auto" />,
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("mask-image:radial-gradient");
    expect(root).toHaveClass("isolation-auto");
    expect(root).not.toHaveClass("isolate");
    rerender(<StarsBackground fade="bottom" />);
    expect(root?.className).toContain("mask-image:linear-gradient");
    rerender(<StarsBackground fade="none" />);
    expect(root?.className).not.toContain("mask-image");
  });

  it("forwards its ref and spreads props onto the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<StarsBackground ref={ref} id="sky" data-testid="sky" title="Night" />);
    expect(ref.current).toBe(screen.getByTestId("sky"));
    expect(ref.current).toHaveAttribute("id", "sky");
    expect(ref.current).toHaveAttribute("title", "Night");
  });
});
