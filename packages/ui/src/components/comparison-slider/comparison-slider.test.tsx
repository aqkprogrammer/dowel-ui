import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  clampComparisonValue,
  ComparisonSlider,
  comparisonValueAt,
  type ComparisonSliderProps,
} from "./comparison-slider";

function Example(props: Partial<ComparisonSliderProps>) {
  return (
    <ComparisonSlider
      data-testid="frame"
      before={<p>Old dashboard</p>}
      after={<p>New dashboard</p>}
      {...props}
    />
  );
}

const handle = () => screen.getByRole("slider", { name: "Comparison position" });

/** Gives the frame a 400×200 box at the origin. */
function sized(frame: HTMLElement) {
  frame.getBoundingClientRect = () => new DOMRect(0, 0, 400, 200);
  const capture = vi.fn();
  frame.setPointerCapture = capture;
  return { frame, capture };
}

describe("ComparisonSlider", () => {
  it("shows both versions and a named slider that says how much of each shows", async () => {
    const { container } = render(<Example beforeLabel="Old" afterLabel="New" />);
    expect(screen.getByText("Old dashboard")).toBeInTheDocument();
    expect(screen.getByText("New dashboard")).toBeInTheDocument();
    expect(handle()).toHaveAttribute("aria-valuenow", "50");
    expect(handle()).toHaveAttribute("aria-valuemin", "0");
    expect(handle()).toHaveAttribute("aria-valuemax", "100");
    expect(handle()).toHaveAttribute("aria-valuetext", "50% Old, 50% New");
    expect(handle()).toHaveAttribute("aria-orientation", "horizontal");
    // The side tags are decoration; their names are in the value text.
    for (const tag of container.querySelectorAll("[data-slot=comparison-slider-label]")) {
      expect(tag).toHaveAttribute("aria-hidden", "true");
    }
    await expectNoA11yViolations(container);
  });

  it("clips the before side to the divider, mirrored for right-to-left", () => {
    const { container } = render(<Example defaultValue={30} />);
    const frame = screen.getByTestId("frame");
    expect(frame.style.getPropertyValue("--comparison-position")).toBe("30%");
    const before = container.querySelector("[data-slot=comparison-slider-before]");
    expect(before?.className).toContain(
      "[clip-path:inset(0_calc(100%-var(--comparison-position))_0_0)]",
    );
    expect(before?.className).toContain(
      "rtl:[clip-path:inset(0_0_0_calc(100%-var(--comparison-position)))]",
    );
  });

  it("steps with the keyboard: 1, 10 with Shift or Page keys, and to either side", () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(handle()).toHaveAttribute("aria-valuenow", "51");
    fireEvent.keyDown(handle(), { key: "ArrowLeft", shiftKey: true });
    expect(handle()).toHaveAttribute("aria-valuenow", "41");
    fireEvent.keyDown(handle(), { key: "PageUp" });
    expect(handle()).toHaveAttribute("aria-valuenow", "51");
    fireEvent.keyDown(handle(), { key: "End" });
    expect(handle()).toHaveAttribute("aria-valuenow", "100");
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(handle()).toHaveAttribute("aria-valuenow", "100");
    fireEvent.keyDown(handle(), { key: "Home" });
    expect(handle()).toHaveAttribute("aria-valuenow", "0");
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    // At the edge already: no change, no call.
    onValueChange.mockClear();
    fireEvent.keyDown(handle(), { key: "PageDown" });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("follows reading direction with the arrows in a right-to-left document", () => {
    render(<Example style={{ direction: "rtl" }} />);
    fireEvent.keyDown(handle(), { key: "ArrowLeft" });
    expect(handle()).toHaveAttribute("aria-valuenow", "51");
  });

  it("steps up and down when vertical", () => {
    render(<Example orientation="vertical" />);
    expect(handle()).toHaveAttribute("aria-orientation", "vertical");
    fireEvent.keyDown(handle(), { key: "ArrowDown" });
    expect(handle()).toHaveAttribute("aria-valuenow", "51");
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(handle()).toHaveAttribute("aria-valuenow", "51");
  });

  it("jumps to a press and drags with the pointer", () => {
    render(<Example />);
    const { frame, capture } = sized(screen.getByTestId("frame"));
    fireEvent.pointerDown(frame, { pointerId: 1, button: 0, clientX: 100, clientY: 50 });
    expect(handle()).toHaveAttribute("aria-valuenow", "25");
    expect(frame).toHaveAttribute("data-dragging", "true");
    expect(capture).toHaveBeenCalledWith(1);
    fireEvent.pointerMove(frame, { pointerId: 1, clientX: 300, clientY: 50 });
    expect(handle()).toHaveAttribute("aria-valuenow", "75");
    fireEvent.pointerUp(frame, { pointerId: 1 });
    expect(frame).not.toHaveAttribute("data-dragging");
    fireEvent.pointerMove(frame, {
      pointerId: 1,
      clientX: 40,
      clientY: 50,
      pointerType: "mouse",
    });
    expect(handle()).toHaveAttribute("aria-valuenow", "75");
  });

  it("follows a mouse without a press in hover mode, but not touch", () => {
    render(<Example interaction="hover" />);
    const { frame } = sized(screen.getByTestId("frame"));
    fireEvent.pointerMove(frame, {
      pointerId: 1,
      clientX: 40,
      clientY: 50,
      pointerType: "mouse",
    });
    expect(handle()).toHaveAttribute("aria-valuenow", "10");
    fireEvent.pointerMove(frame, {
      pointerId: 2,
      clientX: 200,
      clientY: 50,
      pointerType: "touch",
    });
    expect(handle()).toHaveAttribute("aria-valuenow", "10");
  });

  it("ignores presses other than the main button, and stops on cancel", () => {
    render(<Example />);
    const { frame } = sized(screen.getByTestId("frame"));
    fireEvent.pointerDown(frame, { pointerId: 1, button: 2, clientX: 100, clientY: 50 });
    expect(handle()).toHaveAttribute("aria-valuenow", "50");
    fireEvent.pointerDown(frame, { pointerId: 1, button: 0, clientX: 100, clientY: 50 });
    fireEvent.pointerCancel(frame, { pointerId: 1 });
    fireEvent.pointerMove(frame, { pointerId: 1, clientX: 300, clientY: 50 });
    expect(handle()).toHaveAttribute("aria-valuenow", "25");
  });

  it("follows a controlled value, clamped, and reports requests to change it", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Example value={20} onValueChange={onValueChange} />);
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenCalledWith(21);
    expect(handle()).toHaveAttribute("aria-valuenow", "20");
    rerender(<Example value={140} onValueChange={onValueChange} />);
    expect(handle()).toHaveAttribute("aria-valuenow", "100");
  });

  it("can hide the side tags and rename the slider", () => {
    const { container } = render(<Example hideLabels label="Reveal the edit" />);
    expect(container.querySelector("[data-slot=comparison-slider-label]")).toBeNull();
    expect(screen.getByRole("slider", { name: "Reveal the edit" })).toBeInTheDocument();
  });

  it("lets className win, forwards its ref and spreads props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Example ref={ref} className="rounded-none" id="compare" />);
    expect(ref.current).toBe(screen.getByTestId("frame"));
    expect(ref.current).toHaveClass("rounded-none");
    expect(ref.current).not.toHaveClass("rounded-xl");
    expect(ref.current).toHaveAttribute("id", "compare");
  });
});

describe("comparison helpers", () => {
  it("clamps and rounds a position", () => {
    expect(clampComparisonValue(-5)).toBe(0);
    expect(clampComparisonValue(120)).toBe(100);
    expect(clampComparisonValue(33.333)).toBe(33.3);
    expect(clampComparisonValue(Number.NaN)).toBe(50);
  });

  it("maps a pointer to a position from the before edge", () => {
    const box = { left: 100, top: 50, width: 200, height: 100 };
    expect(comparisonValueAt(box, 150, 0, "horizontal", false)).toBe(25);
    expect(comparisonValueAt(box, 150, 0, "horizontal", true)).toBe(75);
    expect(comparisonValueAt(box, 0, 75, "vertical", false)).toBe(25);
    expect(comparisonValueAt({ ...box, width: 0 }, 150, 0, "horizontal", false)).toBe(50);
    expect(comparisonValueAt({ ...box, height: 0 }, 0, 75, "vertical", false)).toBe(50);
  });
});
