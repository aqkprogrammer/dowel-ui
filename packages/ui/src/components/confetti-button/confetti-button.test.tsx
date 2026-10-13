import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import {
  burstConfetti,
  confettiAlpha,
  ConfettiButton,
  confettiRandom,
  createConfetti,
  stepConfetti,
} from "./confetti-button";

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

const overlay = () => document.querySelector("[data-slot=confetti-canvas]");

describe("ConfettiButton", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 800, height: 600 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
    overlay()?.remove();
  });

  it("is a Button that bursts confetti on a hidden overlay when pressed", async () => {
    const onClick = vi.fn();
    const { container } = render(<ConfettiButton onClick={onClick}>Ship it</ConfettiButton>);
    fireEvent.click(screen.getByRole("button", { name: "Ship it" }));
    expect(onClick).toHaveBeenCalled();
    const canvas = overlay();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect((canvas as HTMLCanvasElement | null)?.style.pointerEvents).toBe("none");
    act(() => void mock.flush(3));
    expect(mock.count("fillRect") + mock.count("arc")).toBeGreaterThan(0);
    await expectNoA11yViolations(container);
  });

  it("removes the overlay once every piece has fallen", () => {
    render(<ConfettiButton>Go</ConfettiButton>);
    fireEvent.click(screen.getByRole("button"));
    act(() => void mock.flush(400, 33));
    expect(overlay()).toBeNull();
    expect(mock.pending()).toBe(0);
  });

  it("does not burst when the click handler prevents it, or under reduced motion", () => {
    const { unmount } = render(
      <ConfettiButton
        onClick={(event) => {
          event.preventDefault();
        }}
      >
        Go
      </ConfettiButton>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(overlay()).toBeNull();
    unmount();
    mockReducedMotion(true);
    render(<ConfettiButton>Go</ConfettiButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(overlay()).toBeNull();
  });

  it("forwards Button props and its ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <ConfettiButton ref={ref} variant="outline" className="w-full">
        Go
      </ConfettiButton>,
    );
    expect(ref.current).toBe(screen.getByRole("button"));
    expect(ref.current).toHaveClass("w-full");
  });

  it("bursts from a point and can be stopped early", () => {
    const stop = burstConfetti({ x: 100, y: 100 }, { count: 10, colors: ["primary"] });
    expect(overlay()).not.toBeNull();
    stop();
    expect(overlay()).toBeNull();
  });
});

describe("confetti physics", () => {
  it("launches the requested number of pieces in a fan around the angle", () => {
    const pieces = createConfetti(0, 0, 3, confettiRandom(1), {
      count: 50,
      angle: 0,
      spread: 40,
    });
    expect(pieces).toHaveLength(50);
    // Aimed up: every piece starts moving upward.
    expect(pieces.every((piece) => piece.vy < 0)).toBe(true);
    expect(pieces.every((piece) => piece.color >= 0 && piece.color < 3)).toBe(true);
    expect(createConfetti(0, 0, 1, confettiRandom(1), { count: 9999 })).toHaveLength(400);
  });

  it("falls under gravity, fades, and is gone when its life runs out", () => {
    const pieces = createConfetti(0, 0, 1, confettiRandom(2), { count: 5 });
    const startVy = pieces[0]?.vy ?? 0;
    stepConfetti(pieces, 0.1, 1000);
    expect(pieces[0]?.vy).toBeGreaterThan(startVy);
    const piece = pieces[0];
    if (!piece) throw new Error("no piece");
    expect(confettiAlpha({ ...piece, age: 0 })).toBe(1);
    expect(confettiAlpha({ ...piece, age: piece.life })).toBe(0);
    let alive = true;
    for (let i = 0; i < 200 && alive; i += 1) alive = stepConfetti(pieces, 1 / 30, 1000);
    expect(alive).toBe(false);
    expect(pieces).toHaveLength(0);
  });
});
