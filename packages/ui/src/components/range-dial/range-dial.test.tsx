import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { RangeDial, type RangeDialValue } from "./range-dial";

afterEach(() => {
  vi.restoreAllMocks();
});

/** A 200px dial at the origin, so its centre is (100, 100). */
function mockRect(element: Element) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 200,
    right: 200,
    width: 200,
    height: 200,
    toJSON: () => ({}),
  });
}

const normalise = (text: string | null) => (text ?? "").replace(/\s/g, " ");
const start = () => screen.getByRole("slider", { name: "Start time" });
const end = () => screen.getByRole("slider", { name: "End time" });

describe("RangeDial", () => {
  it("renders a named group with two time sliders and the duration", () => {
    const { container } = render(<RangeDial />);
    expect(screen.getByRole("group", { name: "Time range" })).toHaveAttribute(
      "data-slot",
      "range-dial",
    );
    expect(start()).toHaveAttribute("aria-valuenow", String(23 * 60));
    expect(start()).toHaveAttribute("aria-valuemin", "0");
    expect(start()).toHaveAttribute("aria-valuemax", "1439");
    expect(normalise(start().getAttribute("aria-valuetext"))).toBe("11:00 PM");
    expect(normalise(end().getAttribute("aria-valuetext"))).toBe("6:30 AM");
    const readout = container.querySelector('[data-slot="range-dial-readout"]');
    expect(readout).toHaveTextContent("7h30m");
    expect(readout).toHaveTextContent("7 hours 30 minutes");
    // Nothing is announced on first paint.
    expect(container.querySelector('[data-slot="range-dial-status"]')).toBeEmptyDOMElement();
  });

  it("draws the requested number of ticks and marks the window", () => {
    const { container, rerender } = render(<RangeDial defaultValue={[0, 360]} />);
    const ticks = container.querySelectorAll('[data-slot="range-dial-tick"]');
    expect(ticks).toHaveLength(48);
    // 0:00 → 6:00 at 30 minutes a tick is 13 ticks, both ends included.
    expect(container.querySelectorAll("[data-on]")).toHaveLength(13);
    expect(ticks[0]).toHaveAttribute("data-entering");
    expect((ticks[12] as SVGElement).style.getPropertyValue("--d")).toBe("12");
    rerender(<RangeDial defaultValue={[0, 360]} density={200} />);
    expect(container.querySelectorAll('[data-slot="range-dial-tick"]')).toHaveLength(96);
    rerender(<RangeDial defaultValue={[0, 360]} density={2} />);
    expect(container.querySelectorAll('[data-slot="range-dial-tick"]')).toHaveLength(24);
  });

  it("steps by the snap and wraps round midnight from the keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    render(
      <RangeDial
        defaultValue={[1425, 60]}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );
    await user.tab();
    expect(start()).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(start()).toHaveAttribute("aria-valuenow", "0");
    expect(onValueChange).toHaveBeenLastCalledWith([0, 60]);
    expect(onValueCommit).toHaveBeenLastCalledWith([0, 60]);
    await user.keyboard("{ArrowDown}");
    expect(start()).toHaveAttribute("aria-valuenow", "1425");
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(start()).toHaveAttribute("aria-valuenow", "15");
    await user.keyboard("{ArrowLeft}");
    expect(start()).toHaveAttribute("aria-valuenow", "0");
    await user.keyboard("{PageDown}");
    expect(start()).toHaveAttribute("aria-valuenow", "1380");
    await user.keyboard("{PageUp}{PageUp}");
    expect(start()).toHaveAttribute("aria-valuenow", "60");
    await user.keyboard("{End}");
    expect(start()).toHaveAttribute("aria-valuenow", "1425");
    await user.keyboard("{Home}");
    expect(start()).toHaveAttribute("aria-valuenow", "0");
    const calls = onValueCommit.mock.calls.length;
    await user.keyboard("{Home}{a}");
    expect(onValueCommit).toHaveBeenCalledTimes(calls);

    await user.tab();
    expect(end()).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(end()).toHaveAttribute("aria-valuenow", "75");
  });

  it("aligns off-grid values to the snap and honours other snaps", async () => {
    const user = userEvent.setup();
    render(<RangeDial defaultValue={[7, 600]} snap={30} />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(start()).toHaveAttribute("aria-valuenow", "30");
    await user.keyboard("{End}");
    expect(start()).toHaveAttribute("aria-valuenow", "1410");
  });

  it("announces the new duration after a change", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RangeDial formatDuration={(minutes) => `${String(minutes)} min`} />,
    );
    await user.tab();
    await user.tab();
    await user.keyboard("{PageUp}");
    expect(container.querySelector('[data-slot="range-dial-status"]')).toHaveTextContent(
      "510 min",
    );
    expect(container.querySelector('[data-slot="range-dial-readout"]')).toHaveTextContent(
      "8h30m",
    );
  });

  it("grabs the nearest thumb with the pointer and drags it snapped", () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    render(
      <RangeDial
        defaultValue={[0, 360]}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );
    const dial = screen.getByRole("group");
    mockRect(dial);

    // Straight down from the centre is 12:00 — nearer 6:00, so the end thumb.
    fireEvent.pointerDown(dial, { clientX: 100, clientY: 190, pointerId: 1, button: 0 });
    expect(onValueChange).toHaveBeenLastCalledWith([0, 720]);
    expect(dial).toHaveAttribute("data-dragging");
    expect(end()).toHaveFocus();
    // Left of centre is 18:00.
    fireEvent.pointerMove(dial, { clientX: 10, clientY: 100, pointerId: 1 });
    expect(onValueChange).toHaveBeenLastCalledWith([0, 1080]);
    // Just off 18:00 snaps back to it (no change).
    onValueChange.mockClear();
    fireEvent.pointerMove(dial, { clientX: 10, clientY: 101, pointerId: 1 });
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(dial, { pointerId: 1 });
    expect(dial).not.toHaveAttribute("data-dragging");
    expect(onValueCommit).toHaveBeenCalledExactlyOnceWith([0, 1080]);

    // A press near the top grabs the start thumb.
    fireEvent.pointerDown(dial, { clientX: 110, clientY: 10, pointerId: 2, button: 0 });
    expect(start()).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith([30, 1080]);
    fireEvent.pointerCancel(dial, { pointerId: 2 });
    expect(onValueCommit).toHaveBeenLastCalledWith([30, 1080]);

    // Moves without a press do nothing, and neither does a stray release.
    onValueChange.mockClear();
    fireEvent.pointerMove(dial, { clientX: 190, clientY: 100, pointerId: 3 });
    fireEvent.pointerUp(dial, { pointerId: 3 });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("ignores secondary buttons, an unmeasured dial and a disabled dial", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<RangeDial onValueChange={onValueChange} />);
    const dial = screen.getByRole("group");
    fireEvent.pointerDown(dial, { clientX: 10, clientY: 10, pointerId: 1, button: 0 });
    expect(dial).not.toHaveAttribute("data-dragging");
    mockRect(dial);
    fireEvent.pointerDown(dial, { clientX: 10, clientY: 10, pointerId: 1, button: 2 });
    expect(dial).not.toHaveAttribute("data-dragging");

    rerender(<RangeDial onValueChange={onValueChange} disabled />);
    fireEvent.pointerDown(dial, { clientX: 10, clientY: 10, pointerId: 1, button: 0 });
    fireEvent.keyDown(start(), { key: "ArrowRight" });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(start()).toHaveAttribute("tabindex", "-1");
    expect(start()).toHaveAttribute("aria-disabled", "true");
    expect(dial).toHaveAttribute("data-disabled");
  });

  it("forwards consumer pointer handlers", () => {
    const handlers = {
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
      onPointerCancel: vi.fn(),
    };
    render(<RangeDial {...handlers} />);
    const dial = screen.getByRole("group");
    fireEvent.pointerDown(dial, { pointerId: 1 });
    fireEvent.pointerMove(dial, { pointerId: 1 });
    fireEvent.pointerUp(dial, { pointerId: 1 });
    fireEvent.pointerCancel(dial, { pointerId: 1 });
    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledOnce();
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState<RangeDialValue>([1320, 420]);
      return (
        <>
          <RangeDial value={value} onValueChange={setValue} aria-label="Sleep window" />
          <output>{value.join("-")}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("group", { name: "Sleep window" })).toBeInTheDocument();
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("status")).toHaveTextContent("1305-420");
    expect(start()).toHaveAttribute("aria-valuenow", "1305");
  });

  it("stays put when controlled without an update", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<RangeDial value={[60, 120]} onValueChange={onValueChange} />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith([75, 120]);
    expect(start()).toHaveAttribute("aria-valuenow", "60");
  });

  it("uses custom names, formats and locales", () => {
    const { rerender } = render(
      <RangeDial
        thumbLabels={["Bedtime", "Wake up"]}
        formatTime={(minutes) => `${String(minutes)}m`}
      />,
    );
    expect(screen.getByRole("slider", { name: "Bedtime" })).toHaveAttribute(
      "aria-valuetext",
      "1380m",
    );
    rerender(<RangeDial thumbLabels={["Bedtime", "Wake up"]} locale="en-GB" />);
    expect(screen.getByRole("slider", { name: "Bedtime" })).toHaveAttribute(
      "aria-valuetext",
      "23:00",
    );
  });

  it("can be labelled by another element", () => {
    render(
      <>
        <span id="label">Quiet hours</span>
        <RangeDial aria-labelledby="label" />
      </>,
    );
    expect(screen.getByRole("group", { name: "Quiet hours" })).toBeInTheDocument();
  });

  it("replays the draw-in only for ticks joining the window", () => {
    const { container, rerender } = render(<RangeDial value={[0, 60]} />);
    const tick = (index: number) =>
      container.querySelectorAll('[data-slot="range-dial-tick"]')[index] as SVGElement;
    expect(tick(2)).toHaveAttribute("data-entering");
    act(() => {
      rerender(<RangeDial value={[0, 150]} />);
    });
    expect(tick(3)).toHaveAttribute("data-entering");
    expect(tick(3).style.getPropertyValue("--d")).toBe("0");
    expect(tick(5).style.getPropertyValue("--d")).toBe("2");
    expect(tick(2).style.getPropertyValue("--d")).toBe("2");
    rerender(<RangeDial value={[0, 30]} />);
    expect(tick(2)).not.toHaveAttribute("data-on");
    expect(tick(2)).not.toHaveAttribute("data-entering");
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<RangeDial ref={ref} className="w-40" data-testid="dial" />);
    expect(ref.current).toBe(screen.getByTestId("dial"));
    expect(ref.current).toHaveClass("w-40");
    expect(ref.current).not.toHaveClass("w-72");
  });

  it("has no axe violations", async () => {
    const { container } = render(<RangeDial aria-label="Sleep window" />);
    await expectNoA11yViolations(container);
  });
});
