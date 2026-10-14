import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Cube, type CubeFace } from "./cube";

const faces: CubeFace[] = ["Speed", "Safety", "Scale", "Support"].map((label) => ({
  label,
  content: (
    <p>
      {label} <a href={`#${label}`}>more</a>
    </p>
  ),
}));

const current = () => document.querySelector('[data-slot="cube-face"][data-current]');

afterEach(() => {
  vi.useRealTimers();
});

describe("Cube", () => {
  it("is a carousel whose faces are slides, only the front one reachable", async () => {
    const { container } = render(<Cube label="Why us" faces={faces} />);
    expect(screen.getByRole("region", { name: "Why us" })).toHaveAttribute(
      "aria-roledescription",
      "carousel",
    );
    expect(current()).toHaveAttribute("aria-label", "1 of 4: Speed");
    const faceEls = container.querySelectorAll('[data-slot="cube-face"]');
    expect(faceEls).toHaveLength(4);
    expect(faceEls[1]).toHaveAttribute("aria-hidden", "true");
    expect(faceEls[1]).toHaveAttribute("inert");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    await expectNoA11yViolations(container);
  });

  it("turns with the buttons, wrapping, and names the face it lands on", () => {
    const onValueChange = vi.fn();
    render(<Cube label="Why us" faces={faces} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Next face" }));
    expect(current()).toHaveAttribute("aria-label", "2 of 4: Safety");
    expect(screen.getByRole("status")).toHaveTextContent("2 of 4: Safety");
    fireEvent.click(screen.getByRole("button", { name: "Previous face" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous face" }));
    expect(current()).toHaveAttribute("aria-label", "4 of 4: Support");
    expect(onValueChange).toHaveBeenLastCalledWith(3);
  });

  it("turns the short way round: from the last side to the first is one step forward", () => {
    const { container } = render(<Cube label="Why us" faces={faces} defaultValue={3} />);
    const body = container.querySelector('[data-slot="cube-body"]') as HTMLElement;
    const yaw = () => Number(/rotateY\((-?[\d.]+)deg\)/.exec(body.style.transform)?.[1]);
    const before = yaw();
    // Face 4 rests a quarter turn from face 1, wherever it started.
    expect(((before % 360) + 360) % 360).toBe(90);
    fireEvent.click(screen.getByRole("button", { name: "Next face" }));
    // Next is one quarter turn the same way as every other step, not three back.
    expect(yaw() - before).toBe(-90);
    fireEvent.click(screen.getByRole("button", { name: "Next face" }));
    expect(yaw() - before).toBe(-180);
  });

  it("turns with the arrow keys, Home and End, and reaches top and bottom with six faces", () => {
    const six = [...faces, { label: "Top", content: "T" }, { label: "Bottom", content: "B" }];
    render(<Cube label="Six" faces={six} />);
    const viewport = screen.getByRole("group", { name: /use the arrow keys/ });
    fireEvent.keyDown(viewport, { key: "ArrowRight" });
    expect(current()).toHaveAttribute("aria-label", "2 of 6: Safety");
    fireEvent.keyDown(viewport, { key: "End" });
    expect(current()).toHaveAttribute("aria-label", "4 of 6: Support");
    fireEvent.keyDown(viewport, { key: "ArrowUp" });
    expect(current()).toHaveAttribute("aria-label", "5 of 6: Top");
    fireEvent.keyDown(viewport, { key: "ArrowDown" });
    expect(current()).toHaveAttribute("aria-label", "1 of 6: Speed");
    fireEvent.keyDown(viewport, { key: "ArrowDown" });
    expect(current()).toHaveAttribute("aria-label", "6 of 6: Bottom");
    fireEvent.keyDown(viewport, { key: "Home" });
    expect(current()).toHaveAttribute("aria-label", "1 of 6: Speed");
  });

  it("turns by a drag, and leaves a tap alone", () => {
    render(<Cube label="Why us" faces={faces} size={200} />);
    const viewport = screen.getByRole("group", { name: /use the arrow keys/ });
    const capture = vi.fn();
    viewport.setPointerCapture = capture;
    fireEvent.pointerDown(viewport, { button: 0, clientX: 300, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: 302, pointerId: 1 });
    fireEvent.pointerUp(viewport, { clientX: 302, pointerId: 1 });
    expect(capture).not.toHaveBeenCalled();
    expect(current()).toHaveAttribute("aria-label", "1 of 4: Speed");
    // Dragging left by more than half a face brings the next one round.
    fireEvent.pointerDown(viewport, { button: 0, clientX: 300, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: 160, pointerId: 1 });
    fireEvent.pointerUp(viewport, { clientX: 160, pointerId: 1 });
    expect(current()).toHaveAttribute("aria-label", "2 of 4: Safety");
  });

  it("rotates on its own without announcing, and pauses on hover", () => {
    vi.useFakeTimers();
    render(<Cube label="Why us" faces={faces} autoRotate={2000} />);
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(current()).toHaveAttribute("aria-label", "2 of 4: Safety");
    expect(screen.getByRole("status")).toHaveTextContent("");
    fireEvent.pointerEnter(screen.getByRole("region"));
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(current()).toHaveAttribute("aria-label", "2 of 4: Safety");
  });
});
