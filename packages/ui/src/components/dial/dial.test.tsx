import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Dial } from "./dial";

afterEach(() => {
  vi.restoreAllMocks();
});

/** A 160px dial whose centre is at (80, 80). */
function measure(dial: HTMLElement) {
  vi.spyOn(dial, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 160, height: 160 }),
  );
}

function knob(dial: HTMLElement) {
  return dial.querySelector<HTMLElement>('[data-slot="dial-knob"]')!;
}

describe("Dial", () => {
  it("is a named slider with value text and a readout", () => {
    render(<Dial aria-label="Humidity" defaultValue={40} format={(v) => `${String(v)}%`} />);
    const dial = screen.getByRole("slider", { name: "Humidity" });
    expect(dial).toHaveAttribute("aria-valuenow", "40");
    expect(dial).toHaveAttribute("aria-valuetext", "40%");
    expect(dial).toHaveTextContent("40%");
    expect(knob(dial).style.rotate).toBe("-27deg");
  });

  it("steps with arrows, pages and jumps to the ends", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Dial aria-label="Humidity" defaultValue={50} onValueChange={onValueChange} />);
    const dial = screen.getByRole("slider");
    await user.tab();
    await user.keyboard("{ArrowUp}{ArrowRight}");
    expect(dial).toHaveAttribute("aria-valuenow", "52");
    await user.keyboard("{ArrowDown}{ArrowLeft}{ArrowLeft}");
    expect(dial).toHaveAttribute("aria-valuenow", "49");
    await user.keyboard("{PageUp}");
    expect(dial).toHaveAttribute("aria-valuenow", "59");
    await user.keyboard("{PageDown}{PageDown}");
    expect(dial).toHaveAttribute("aria-valuenow", "39");
    await user.keyboard("{End}");
    expect(dial).toHaveAttribute("aria-valuenow", "100");
    await user.keyboard("{End}{Home}x");
    expect(dial).toHaveAttribute("aria-valuenow", "0");
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  it("snaps to detents when asked, with a custom page step", async () => {
    const user = userEvent.setup();
    render(<Dial aria-label="Fan" detents={5} snapToDetents pageStep={50} />);
    const dial = screen.getByRole("slider");
    dial.focus();
    await user.keyboard("{ArrowUp}");
    expect(dial).toHaveAttribute("aria-valuenow", "25");
    await user.keyboard("{PageUp}");
    expect(dial).toHaveAttribute("aria-valuenow", "75");
    expect(dial.querySelectorAll('[data-slot="dial-detent"][data-on]')).toHaveLength(4);
  });

  it("points at the pointer while dragged", () => {
    render(<Dial aria-label="Humidity" />);
    const dial = screen.getByRole("slider");
    measure(dial);
    fireEvent.pointerDown(dial, { pointerId: 1, button: 0, clientX: 80, clientY: 0 });
    expect(dial).toHaveAttribute("aria-valuenow", "50");
    expect(dial).toHaveAttribute("data-dragging");
    fireEvent.pointerMove(dial, { pointerId: 1, clientX: 160, clientY: 80 });
    expect(dial).toHaveAttribute("aria-valuenow", "83");
    fireEvent.pointerMove(dial, { pointerId: 1, clientX: 81, clientY: 160 });
    expect(dial).toHaveAttribute("aria-valuenow", "100");
    fireEvent.pointerMove(dial, { pointerId: 1, clientX: 80, clientY: 80 });
    expect(dial).toHaveAttribute("aria-valuenow", "100");
    fireEvent.pointerUp(dial, { pointerId: 1 });
    expect(dial).not.toHaveAttribute("data-dragging");
    fireEvent.pointerMove(dial, { pointerId: 1, clientX: 0, clientY: 80 });
    expect(dial).toHaveAttribute("aria-valuenow", "100");
  });

  it("ignores other buttons, cancels, and an unmeasured dial", () => {
    render(<Dial aria-label="Humidity" defaultValue={10} />);
    const dial = screen.getByRole("slider");
    fireEvent.pointerDown(dial, { pointerId: 1, button: 0, clientX: 80, clientY: 0 });
    expect(dial).toHaveAttribute("aria-valuenow", "10");
    fireEvent.pointerCancel(dial);
    fireEvent.pointerDown(dial, { pointerId: 1, button: 2 });
    expect(dial).not.toHaveAttribute("data-dragging");
  });

  it("turns with the wheel only while focused", () => {
    render(<Dial aria-label="Humidity" defaultValue={50} />);
    const dial = screen.getByRole("slider");
    fireEvent.wheel(dial, { deltaY: -120 });
    expect(dial).toHaveAttribute("aria-valuenow", "50");
    dial.focus();
    fireEvent.wheel(dial, { deltaY: -20 });
    expect(dial).toHaveAttribute("aria-valuenow", "50");
    fireEvent.wheel(dial, { deltaY: -20 });
    expect(dial).toHaveAttribute("aria-valuenow", "51");
    fireEvent.wheel(dial, { deltaY: 3, deltaMode: 1 });
    expect(dial).toHaveAttribute("aria-valuenow", "48");
  });

  it("clamps, supports decimals and a caption", () => {
    render(
      <Dial aria-label="Gain" min={0} max={1} step={0.05} value={2} caption="dB" size="sm" />,
    );
    const dial = screen.getByRole("slider");
    expect(dial).toHaveAttribute("aria-valuenow", "1");
    expect(dial).toHaveTextContent("dB");
    fireEvent.keyDown(dial, { key: "ArrowDown" });
    expect(dial).toHaveAttribute("aria-valuenow", "1");
  });

  it("follows a controlled value", async () => {
    function Controlled() {
      const [value, setValue] = useState(0.1);
      return (
        <Dial aria-label="Gain" max={1} step={0.1} value={value} onValueChange={setValue} />
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    const dial = screen.getByRole("slider");
    dial.focus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(dial).toHaveAttribute("aria-valuenow", "0.3");
  });

  it("is inert when disabled", () => {
    render(<Dial aria-label="Humidity" disabled defaultValue={20} />);
    const dial = screen.getByRole("slider");
    expect(dial).toHaveAttribute("aria-disabled", "true");
    expect(dial).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(dial, { key: "End" });
    fireEvent.pointerDown(dial, { pointerId: 1, button: 0 });
    expect(dial).toHaveAttribute("aria-valuenow", "20");
  });

  it("lets a consumer className win and forwards refs and handlers", () => {
    const ref = createRef<HTMLDivElement>();
    const callbackRef = vi.fn();
    const handlers = {
      onKeyDown: vi.fn(),
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
    };
    const { rerender } = render(
      <Dial ref={ref} aria-label="Humidity" className="size-20 rounded-md" {...handlers} />,
    );
    const dial = screen.getByRole("slider");
    expect(ref.current).toBe(dial);
    expect(dial).toHaveClass("size-20", "rounded-md");
    expect(dial).not.toHaveClass("size-40", "rounded-full");
    fireEvent.keyDown(dial, { key: "a" });
    fireEvent.pointerDown(dial, { pointerId: 1, button: 0 });
    fireEvent.pointerMove(dial, { pointerId: 1 });
    fireEvent.pointerUp(dial, { pointerId: 1 });
    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalled();
    rerender(<Dial ref={callbackRef} aria-label="Humidity" />);
    expect(callbackRef).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Dial aria-label="Humidity" defaultValue={45} />);
    await expectNoA11yViolations(container);
  });
});
