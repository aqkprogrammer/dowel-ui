import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TickProgress } from "./tick-progress";

afterEach(() => {
  vi.restoreAllMocks();
});

function ticks(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>('[data-slot="tick-progress-tick"]')];
}

/** Ticks row 340px wide from x=0, so each of 34 ticks is 10px. */
function measure(root: HTMLElement) {
  const row = root.querySelector('[data-slot="tick-progress-ticks"]')!;
  vi.spyOn(row, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 340, height: 92 }),
  );
}

function delta(root: HTMLElement) {
  return root.querySelector('[data-slot="tick-progress-delta"]')!;
}

describe("TickProgress", () => {
  it("is a progress bar by default, with the value in text and ticks", () => {
    render(<TickProgress aria-label="Upload" defaultValue={66} />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "66");
    expect(bar).toHaveAttribute("aria-valuetext", "66%");
    expect(bar).not.toHaveAttribute("tabindex");
    expect(ticks(bar)).toHaveLength(34);
    expect(ticks(bar).filter((tick) => tick.hasAttribute("data-on"))).toHaveLength(22);
    expect(bar).toHaveTextContent("66%");
  });

  it("ignores the pointer and keys when display-only", () => {
    render(<TickProgress aria-label="Upload" defaultValue={50} />);
    const bar = screen.getByRole("progressbar");
    measure(bar);
    fireEvent.pointerMove(bar, { clientX: 300 });
    fireEvent.click(bar, { clientX: 300 });
    fireEvent.keyDown(bar, { key: "End" });
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    expect(bar).toHaveTextContent("50%");
  });

  it("previews on hover with a signed delta and a cursor tick, then reverts on leave", () => {
    render(<TickProgress aria-label="Volume" interactive defaultValue={66} />);
    const slider = screen.getByRole("slider", { name: "Volume" });
    measure(slider);

    fireEvent.pointerMove(slider, { clientX: 285 }); // tick 28 → 29/34 = 85%
    expect(slider).toHaveTextContent("85%");
    expect(delta(slider)).toHaveTextContent("+19");
    expect(delta(slider)).toHaveAttribute("data-up");
    expect(ticks(slider)[28]).toHaveAttribute("data-cursor");
    expect(slider).toHaveAttribute("aria-valuenow", "66");

    fireEvent.pointerMove(slider, { clientX: 105 }); // 11/34 = 32%
    expect(delta(slider)).toHaveTextContent("−34");
    expect(delta(slider)).not.toHaveAttribute("data-up");

    fireEvent.pointerLeave(slider);
    expect(slider).toHaveTextContent("66%");
    expect(delta(slider)).not.toHaveAttribute("data-show");
  });

  it("commits on click", () => {
    const onValueChange = vi.fn();
    render(
      <TickProgress
        aria-label="Volume"
        interactive
        defaultValue={66}
        onValueChange={onValueChange}
      />,
    );
    const slider = screen.getByRole("slider");
    measure(slider);
    fireEvent.pointerMove(slider, { clientX: 339 });
    fireEvent.click(slider, { clientX: 339 });
    expect(onValueChange).toHaveBeenCalledWith(100);
    expect(slider).toHaveAttribute("aria-valuenow", "100");
  });

  it("mirrors the pointer in right-to-left layouts", () => {
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <TickProgress aria-label="Volume" interactive defaultValue={0} />
      </div>,
    );
    const slider = screen.getByRole("slider");
    measure(slider);
    fireEvent.click(slider, { clientX: 335 });
    expect(slider).toHaveAttribute("aria-valuenow", "3");
  });

  it("steps from the keyboard and commits at once", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <TickProgress
        aria-label="Volume"
        interactive
        defaultValue={50}
        onValueChange={onValueChange}
      />,
    );
    const slider = screen.getByRole("slider");
    await user.tab();
    expect(slider).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuenow", "53");
    await user.keyboard("{ArrowDown}");
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    await user.keyboard("{PageUp}");
    expect(slider).toHaveAttribute("aria-valuenow", "65");
    await user.keyboard("{PageDown}{ArrowLeft}{ArrowUp}");
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    await user.keyboard("{End}");
    expect(slider).toHaveAttribute("aria-valuenow", "100");
    await user.keyboard("{Home}");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  it("follows the controlled value", async () => {
    function Controlled() {
      const [value, setValue] = useState(10);
      return (
        <>
          <TickProgress aria-label="Level" interactive value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.tab();
    await user.keyboard("{End}");
    expect(screen.getByRole("status")).toHaveTextContent("100");
  });

  it("is inert when disabled", () => {
    render(<TickProgress aria-label="Level" interactive disabled defaultValue={20} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-disabled", "true");
    expect(slider).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(slider, { key: "End" });
    expect(slider).toHaveAttribute("aria-valuenow", "20");
  });

  it("takes a tick count, custom heights, clamps its value and can hide the figure", () => {
    render(
      <TickProgress
        aria-label="Level"
        ticks={4}
        heights={[10, 20, 30, 40]}
        value={150}
        hideValue
      />,
    );
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(ticks(bar)).toHaveLength(4);
    expect(ticks(bar)[3]).toHaveStyle({ height: "40%" });
    expect(bar.querySelector('[data-slot="tick-progress-head"]')).toBeNull();
  });

  it("does not preview without a measurable row", () => {
    render(<TickProgress aria-label="Level" interactive defaultValue={20} />);
    const slider = screen.getByRole("slider");
    fireEvent.pointerMove(slider, { clientX: 100 });
    fireEvent.click(slider, { clientX: 100 });
    expect(slider).toHaveTextContent("20%");
  });

  it("lets a consumer className win and forwards ref, props and handlers", () => {
    const ref = createRef<HTMLDivElement>();
    const onKeyDown = vi.fn();
    const onClick = vi.fn();
    const onPointerMove = vi.fn();
    const onPointerLeave = vi.fn();
    render(
      <TickProgress
        ref={ref}
        aria-label="Level"
        className="w-full rounded-none"
        data-testid="ticks"
        stroke
        onKeyDown={onKeyDown}
        onClick={onClick}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      />,
    );
    const bar = screen.getByTestId("ticks");
    expect(ref.current).toBe(bar);
    expect(bar).toHaveClass("w-full", "rounded-none");
    expect(bar).not.toHaveClass("rounded-[1.25rem]");
    fireEvent.keyDown(bar, { key: "a" });
    fireEvent.click(bar);
    fireEvent.pointerMove(bar);
    fireEvent.pointerLeave(bar);
    expect(onKeyDown).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalled();
    expect(onPointerMove).toHaveBeenCalled();
    expect(onPointerLeave).toHaveBeenCalled();
  });

  it("has no accessibility violations in either mode", async () => {
    const { container } = render(
      <>
        <TickProgress aria-label="Upload" defaultValue={66} />
        <TickProgress aria-label="Volume" interactive defaultValue={40} />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
