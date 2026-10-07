import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { GravityStarsBackground } from "./gravity-stars-background";

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

/** Runs frames, then records exactly one. */
function frame(mock: CanvasMock, before = 1) {
  act(() => void mock.flush(before));
  mock.reset();
  act(() => void mock.flush(1));
}

function arcs(mock: CanvasMock) {
  return mock.calls.filter((call) => call.method === "arc");
}

describe("GravityStarsBackground", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 500, height: 300 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("renders its children above an aria-hidden canvas", async () => {
    const { container } = render(
      <GravityStarsBackground>
        <a href="#start">Get started</a>
      </GravityStarsBackground>,
    );
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-slot", "gravity-stars-background");
    expect(root).toHaveAttribute("data-interactive", "true");
    expect(root).toHaveClass("relative", "isolate", "overflow-hidden");
    const canvas = container.querySelector("[data-slot=gravity-stars-background-canvas]");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveClass("pointer-events-none");
    expect(
      container.querySelector("[data-slot=gravity-stars-background-content]"),
    ).toContainElement(screen.getByRole("link", { name: "Get started" }));
    await expectNoA11yViolations(container);
  });

  it("draws one dot per particle, scaled by density, with links between close ones", () => {
    const { rerender } = render(<GravityStarsBackground color="info" />);
    frame(mock);
    // 500×300 at density 1 is 30 particles.
    expect(arcs(mock)).toHaveLength(30);
    expect(mock.calls.find((call) => call.method === "fill")?.fillStyle).toBe(
      "var(--color-info)",
    );
    expect(mock.count("lineTo")).toBeGreaterThan(0);

    rerender(<GravityStarsBackground color="info" density={2} connections={false} />);
    frame(mock);
    expect(arcs(mock)).toHaveLength(60);
    expect(mock.count("lineTo")).toBe(0);
  });

  it("keeps the field across a resize-free re-render and rebuilds for a new seed", () => {
    const { rerender } = render(<GravityStarsBackground connections={false} seed={2} />);
    frame(mock);
    const first = arcs(mock).map((call) => call.args[0]);
    rerender(<GravityStarsBackground connections={false} seed={3} />);
    mock.reset();
    act(() => void mock.flush(1));
    expect(arcs(mock).map((call) => call.args[0])).not.toEqual(first);
  });

  it("draws a well under the pointer, pulls particles into it, and lets go on leave", () => {
    const onPointerMove = vi.fn();
    const onPointerLeave = vi.fn();
    const { container } = render(
      <GravityStarsBackground
        density={3}
        connections={false}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    frame(mock);
    const centre = { x: 250, y: 150 };
    const near = (calls: ReturnType<typeof arcs>) =>
      calls.filter(
        (call) =>
          Math.hypot((call.args[0] as number) - centre.x, (call.args[1] as number) - centre.y) <
          120,
      ).length;
    const before = near(arcs(mock));

    fireEvent.pointerMove(root, { clientX: centre.x, clientY: centre.y });
    expect(onPointerMove).toHaveBeenCalled();
    frame(mock, 180);
    // The halo is two fills in the glow colour, centred on the pointer.
    const halo = arcs(mock).filter((call) => call.args[0] === centre.x);
    expect(halo.length).toBeGreaterThanOrEqual(2);
    expect(near(arcs(mock))).toBeGreaterThan(before);
    // Orbiting particles are fast enough to trail.
    expect(mock.count("stroke")).toBeGreaterThan(0);

    fireEvent.pointerLeave(root);
    expect(onPointerLeave).toHaveBeenCalled();
    frame(mock);
    expect(arcs(mock).filter((call) => call.args[0] === centre.x).length).toBeLessThan(
      halo.length,
    );
  });

  it("sends a shockwave ring from a press, and a lifted finger releases the well", () => {
    const onPointerDown = vi.fn();
    const onPointerUp = vi.fn();
    const onPointerCancel = vi.fn();
    const { container } = render(
      <GravityStarsBackground
        connections={false}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    frame(mock);
    fireEvent.pointerDown(root, { clientX: 100, clientY: 100, pointerType: "touch" });
    expect(onPointerDown).toHaveBeenCalled();
    frame(mock, 3);
    // The ring is stroked around the press point.
    const rings = mock.calls.filter(
      (call) => call.method === "arc" && call.args[0] === 100 && (call.args[2] as number) > 20,
    );
    expect(rings.length).toBeGreaterThanOrEqual(1);

    fireEvent.pointerUp(root, { pointerType: "touch" });
    expect(onPointerUp).toHaveBeenCalled();
    frame(mock, 90);
    // Well released and the wave spent: nothing is drawn at the press point.
    expect(mock.calls.filter((call) => call.method === "arc" && call.args[0] === 100)).toEqual(
      [],
    );

    fireEvent.pointerMove(root, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(root, { pointerType: "mouse" });
    frame(mock);
    expect(
      mock.calls.filter((call) => call.method === "arc" && call.args[0] === 100).length,
    ).toBeGreaterThan(0);
    fireEvent.pointerCancel(root);
    expect(onPointerCancel).toHaveBeenCalled();
    frame(mock);
    expect(mock.calls.filter((call) => call.method === "arc" && call.args[0] === 100)).toEqual(
      [],
    );
  });

  it("ignores the pointer when not interactive", () => {
    const { container } = render(
      <GravityStarsBackground interactive={false} connections={false} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toHaveAttribute("data-interactive");
    frame(mock);
    fireEvent.pointerMove(root, { clientX: 77, clientY: 77 });
    fireEvent.pointerDown(root, { clientX: 77, clientY: 77 });
    frame(mock, 3);
    expect(mock.calls.filter((call) => call.method === "arc" && call.args[0] === 77)).toEqual(
      [],
    );
  });

  it("draws one still frame under reduced motion and ignores the pointer", () => {
    mockReducedMotion(true);
    const { container } = render(<GravityStarsBackground />);
    act(() => void mock.flush(5));
    const drawn = mock.count("clearRect");
    expect(drawn).toBeGreaterThan(0);
    expect(mock.count("arc")).toBeGreaterThan(0);
    fireEvent.pointerMove(container.firstElementChild as HTMLElement, {
      clientX: 10,
      clientY: 10,
    });
    act(() => void mock.flush(50));
    expect(mock.count("clearRect")).toBe(drawn);
    expect(mock.pending()).toBe(0);
  });

  it("applies the fade variant and lets className win a conflict", () => {
    const { container, rerender } = render(
      <GravityStarsBackground fade="edges" className="overflow-visible" />,
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("mask-image:radial-gradient");
    expect(root).toHaveClass("overflow-visible");
    expect(root).not.toHaveClass("overflow-hidden");
    rerender(<GravityStarsBackground fade="none" />);
    expect(root?.className).not.toContain("mask-image");
  });

  it("forwards its ref and spreads props onto the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<GravityStarsBackground ref={ref} data-testid="field" id="field" />);
    expect(ref.current).toBe(screen.getByTestId("field"));
    expect(ref.current).toHaveAttribute("id", "field");
  });
});
