import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { HoleBackground } from "./hole-background";

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

/** The event horizon: the filled ellipse, drawn last. */
function core(mock: CanvasMock) {
  const fillIndex = mock.calls.findIndex((call) => call.method === "fill");
  const ellipses = mock.calls.slice(0, fillIndex).filter((call) => call.method === "ellipse");
  return ellipses.at(-1)?.args as number[] | undefined;
}

describe("HoleBackground", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 600, height: 400 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("renders its children above an aria-hidden canvas and vignette", async () => {
    const { container } = render(
      <HoleBackground>
        <h2>Into the deep</h2>
      </HoleBackground>,
    );
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-slot", "hole-background");
    expect(root).toHaveAttribute("data-shape", "well");
    expect(root).toHaveClass("relative", "isolate", "overflow-hidden");
    for (const slot of ["hole-background-canvas", "hole-background-vignette"]) {
      const layer = container.querySelector(`[data-slot=${slot}]`);
      expect(layer).toHaveAttribute("aria-hidden", "true");
      expect(layer).toHaveClass("pointer-events-none", "absolute", "inset-0");
    }
    expect(container.querySelector("[data-slot=hole-background-content]")).toContainElement(
      screen.getByRole("heading", { name: "Into the deep" }),
    );
    await expectNoA11yViolations(container);
  });

  it("draws rings, spokes, particles and a dark core with a glowing rim", () => {
    render(<HoleBackground color="info" glowColor="warning" />);
    frame(mock);
    // Rings that are visible, plus the core's fill and rim.
    expect(mock.count("ellipse")).toBeGreaterThanOrEqual(14);
    const fill = mock.calls.find((call) => call.method === "fill");
    expect(fill?.fillStyle).toBe("var(--color-background)");
    const [x, y] = core(mock) ?? [];
    expect(x).toBe(300);
    expect(y).toBe(200);
    // 600×400 at density 1 is 96 particles, each a streak.
    expect(mock.count("stroke")).toBeGreaterThan(60);
  });

  it("scales rings, spokes and particles with their props", () => {
    const { rerender } = render(<HoleBackground rings={0} spokes={0} density={0} />);
    frame(mock);
    // Only the core is left: one fill and one rim.
    expect(mock.count("ellipse")).toBe(2);
    expect(mock.count("stroke")).toBe(1);
    rerender(<HoleBackground rings={0} spokes={6} density={0} />);
    frame(mock);
    expect(mock.count("moveTo")).toBe(6);
  });

  it("flows while animating", () => {
    render(<HoleBackground density={0} spokes={0} />);
    frame(mock);
    const radii = mock.calls.filter((call) => call.method === "ellipse").map((c) => c.args[2]);
    frame(mock, 20);
    const later = mock.calls.filter((call) => call.method === "ellipse").map((c) => c.args[2]);
    expect(later).not.toEqual(radii);
  });

  it("eases the vanishing point toward the pointer, and back when it leaves", () => {
    const onPointerMove = vi.fn();
    const onPointerLeave = vi.fn();
    const { container } = render(
      <HoleBackground onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} />,
    );
    const root = container.firstElementChild as HTMLElement;
    frame(mock);
    fireEvent.pointerMove(root, { clientX: 450, clientY: 100 });
    expect(onPointerMove).toHaveBeenCalled();
    frame(mock, 2);
    const [early] = core(mock) ?? [];
    expect(early).toBeGreaterThan(300);
    expect(early).toBeLessThan(440);
    frame(mock, 300);
    const [x, y] = core(mock) ?? [];
    // The core sits a hair in from the vanishing point, toward the box centre.
    expect(x).toBeCloseTo(450 - 150 * 0.045, 1);
    expect(y).toBeCloseTo(100 + 100 * 0.045, 1);

    fireEvent.pointerLeave(root);
    expect(onPointerLeave).toHaveBeenCalled();
    frame(mock, 400);
    const [backX, backY] = core(mock) ?? [];
    expect(backX).toBeCloseTo(300, 0);
    expect(backY).toBeCloseTo(200, 0);
  });

  it("ignores the pointer when not interactive", () => {
    const { container } = render(<HoleBackground interactive={false} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toHaveAttribute("data-interactive");
    frame(mock);
    fireEvent.pointerMove(root, { clientX: 0, clientY: 0 });
    frame(mock, 60);
    expect(core(mock)?.slice(0, 2)).toEqual([300, 200]);
  });

  it("draws one still frame under reduced motion, centred, ignoring the pointer", () => {
    mockReducedMotion(true);
    const { container } = render(<HoleBackground />);
    act(() => void mock.flush(5));
    const drawn = mock.count("clearRect");
    expect(drawn).toBeGreaterThan(0);
    expect(core(mock)?.slice(0, 2)).toEqual([300, 200]);
    fireEvent.pointerMove(container.firstElementChild as HTMLElement, {
      clientX: 10,
      clientY: 10,
    });
    act(() => void mock.flush(50));
    expect(mock.count("clearRect")).toBe(drawn);
    expect(mock.pending()).toBe(0);
  });

  it("applies the shape and vignette variants and lets className win a conflict", () => {
    const { container, rerender } = render(
      <HoleBackground shape="tunnel" vignette="strong" className="isolation-auto" />,
    );
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-shape", "tunnel");
    expect(root?.className).toContain("transparent_25%");
    expect(root).toHaveClass("isolation-auto");
    expect(root).not.toHaveClass("isolate");
    rerender(<HoleBackground />);
    expect(root?.className).toContain("transparent_45%");
    rerender(<HoleBackground vignette="none" />);
    expect(root?.className).toContain("hidden");
    frame(mock);
    // A tunnel's core is round; a well's is squashed.
    rerender(<HoleBackground shape="tunnel" />);
    frame(mock);
    const round = core(mock) ?? [];
    expect(round[2]).toBeCloseTo(round[3] ?? 0);
  });

  it("forwards its ref and spreads props onto the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<HoleBackground ref={ref} data-testid="hole" id="hole" />);
    expect(ref.current).toBe(screen.getByTestId("hole"));
    expect(ref.current).toHaveAttribute("id", "hole");
  });
});
