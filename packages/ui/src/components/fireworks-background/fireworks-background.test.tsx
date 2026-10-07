import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { FIREWORKS_PALETTE, FireworksBackground } from "./fireworks-background";

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

describe("FireworksBackground", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 600, height: 400 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("renders its children above an aria-hidden canvas, and they stay operable", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { container } = render(
      <FireworksBackground>
        <button type="button" onClick={onClick}>
          Celebrate
        </button>
      </FireworksBackground>,
    );
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-slot", "fireworks-background");
    expect(root).toHaveClass("relative", "isolate", "overflow-hidden");
    const canvas = container.querySelector("[data-slot=fireworks-background-canvas]");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveClass("pointer-events-none");
    await user.click(screen.getByRole("button", { name: "Celebrate" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(2);
    await expectNoA11yViolations(container);
  });

  it("launches rockets on a timer that burst into sparks", () => {
    render(<FireworksBackground />);
    act(() => void mock.flush(30));
    mock.reset();
    act(() => void mock.flush(1));
    // A rocket in flight: a glowing head and its trail.
    expect(mock.count("arc")).toBeGreaterThanOrEqual(1);
    act(() => void mock.flush(150));
    mock.reset();
    act(() => void mock.flush(1));
    // Sparks are short strokes.
    expect(mock.count("stroke")).toBeGreaterThan(30);
  });

  it("cycles burst colours through the palette, or uses one colour", () => {
    const fills = (calls: CanvasMock["calls"]) =>
      new Set(calls.filter((call) => call.method === "fill").map((call) => call.fillStyle));
    const { rerender } = render(<FireworksBackground rate={3} />);
    const seen = new Set<unknown>();
    for (let i = 0; i < 40; i += 1) {
      mock.reset();
      act(() => void mock.flush(15));
      for (const style of fills(mock.calls)) seen.add(style);
    }
    expect(seen.has("var(--color-primary)")).toBe(true);
    expect(seen.has("var(--color-info)")).toBe(true);
    expect(seen.size).toBeGreaterThanOrEqual(4);
    expect(FIREWORKS_PALETTE).toHaveLength(6);

    rerender(<FireworksBackground rate={3} color="warning" />);
    act(() => void mock.flush(300));
    seen.clear();
    for (let i = 0; i < 20; i += 1) {
      mock.reset();
      act(() => void mock.flush(15));
      for (const style of fills(mock.calls)) seen.add(style);
    }
    expect([...seen]).toEqual(["var(--color-warning)"]);
  });

  it("falls back to the default palette for an empty one", () => {
    render(<FireworksBackground palette={[]} rate={3} />);
    act(() => void mock.flush(60));
    expect(
      mock.calls.some(
        (call) => call.method === "fill" && call.fillStyle === "var(--color-primary)",
      ),
    ).toBe(true);
  });

  it("launches nothing on its own without autoLaunch, but a press launches one", () => {
    const onPointerDown = vi.fn();
    const { container } = render(
      <FireworksBackground autoLaunch={false} onPointerDown={onPointerDown} />,
    );
    act(() => void mock.flush(120));
    mock.reset();
    act(() => void mock.flush(1));
    expect(mock.count("arc")).toBe(0);
    expect(mock.count("stroke")).toBe(0);

    fireEvent.pointerDown(container.firstElementChild as HTMLElement, {
      clientX: 300,
      clientY: 120,
    });
    expect(onPointerDown).toHaveBeenCalled();
    act(() => void mock.flush(4));
    mock.reset();
    act(() => void mock.flush(1));
    expect(mock.count("arc")).toBe(1);
    // It bursts near where it was aimed.
    act(() => void mock.flush(200));
    const flash = mock.calls.find(
      (call) => call.method === "arc" && (call.args[2] as number) >= 6,
    );
    expect(flash?.args[0] as number).toBeGreaterThan(280);
    expect(flash?.args[0] as number).toBeLessThan(320);
    expect(flash?.args[1] as number).toBeGreaterThan(105);
    expect(flash?.args[1] as number).toBeLessThan(140);
  });

  it("ignores presses when not interactive", () => {
    const { container } = render(
      <FireworksBackground autoLaunch={false} interactive={false} />,
    );
    expect(container.firstElementChild).not.toHaveAttribute("data-interactive");
    act(() => void mock.flush(2));
    fireEvent.pointerDown(container.firstElementChild as HTMLElement, {
      clientX: 300,
      clientY: 120,
    });
    act(() => void mock.flush(4));
    mock.reset();
    act(() => void mock.flush(1));
    expect(mock.count("arc")).toBe(0);
  });

  it("draws one still frame of frozen bursts under reduced motion", () => {
    mockReducedMotion(true);
    const { container } = render(<FireworksBackground particleCount={40} />);
    act(() => void mock.flush(5));
    const drawn = mock.count("clearRect");
    expect(drawn).toBeGreaterThan(0);
    // Three bursts of sparks, no rockets.
    expect(mock.count("stroke")).toBeGreaterThan(80);
    expect(mock.count("arc")).toBe(0);
    fireEvent.pointerDown(container.firstElementChild as HTMLElement, {
      clientX: 10,
      clientY: 10,
    });
    act(() => void mock.flush(50));
    expect(mock.count("clearRect")).toBe(drawn);
    expect(mock.pending()).toBe(0);
  });

  it("applies the fade variant and lets className win a conflict", () => {
    const { container, rerender } = render(
      <FireworksBackground fade="bottom" className="overflow-clip" />,
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("mask-image:linear-gradient");
    expect(root).toHaveClass("overflow-clip");
    expect(root).not.toHaveClass("overflow-hidden");
    rerender(<FireworksBackground fade="none" />);
    expect(root?.className).not.toContain("mask-image");
  });

  it("forwards its ref and spreads props onto the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<FireworksBackground ref={ref} data-testid="show" title="Show" />);
    expect(ref.current).toBe(screen.getByTestId("show"));
    expect(ref.current).toHaveAttribute("title", "Show");
  });
});
