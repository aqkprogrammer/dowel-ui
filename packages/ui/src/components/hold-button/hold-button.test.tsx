import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { HoldButton } from "./hold-button";

/*
 * The hold is a requestAnimationFrame clock read from performance.now(), so
 * the tests fake both (Vitest's default fake set) and step time by hand.
 */
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};
const button = () => screen.getByRole("button");
const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
const progress = () =>
  Number(slot("hold-button-ink").style.getPropertyValue("--hold-progress"));
const press = () => fireEvent.pointerDown(button(), { button: 0, pointerId: 1 });
const lift = () => fireEvent.pointerUp(button(), { button: 0, pointerId: 1 });

function mockReducedMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("reduce"),
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

describe("HoldButton", () => {
  it("is a button named by its label and described by the hold hint", () => {
    render(<HoldButton label="Delete project" />);
    const control = screen.getByRole("button", { name: "Delete project" });
    expect(control).toHaveAccessibleDescription("Press and hold to confirm.");
    expect(control).toHaveAttribute("type", "button");
    expect(control).toHaveAttribute("data-state", "idle");
    expect(control).not.toHaveAttribute("aria-disabled");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(slot("hold-button-ink")).toHaveAttribute("aria-hidden", "true");
  });

  it("confirms only once the pointer has been held for holdDuration", () => {
    const onConfirm = vi.fn();
    const onHoldStart = vi.fn();
    render(
      <HoldButton onConfirm={onConfirm} onHoldStart={onHoldStart} confirmedLabel="Done" />,
    );
    press();
    expect(onHoldStart).toHaveBeenCalledOnce();
    expect(button()).toHaveAttribute("data-state", "holding");
    advance(600);
    expect(progress()).toBeGreaterThan(0.45);
    expect(progress()).toBeLessThan(0.55);
    advance(580);
    expect(onConfirm).not.toHaveBeenCalled();
    advance(40);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(progress()).toBe(1);
    expect(button()).toHaveAttribute("data-state", "confirmed");
    expect(button()).toHaveAttribute("aria-disabled", "true");
    expect(button()).toHaveAccessibleName("Hold to confirm");
    expect(slot("hold-button-tick")).toHaveAttribute("data-state", "visible");
    expect(slot("hold-button-icon")).toHaveAttribute("data-state", "hidden");
    expect(slot("hold-button-confirmed-label")).toHaveAttribute("data-state", "visible");
    expect(screen.getByRole("status")).toHaveTextContent("Done");
    lift();
    advance(5000);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(button()).toHaveAttribute("data-state", "confirmed");
  });

  it("drains back when let go early, and carries on from there when pressed again", () => {
    const onConfirm = vi.fn();
    const onHoldCancel = vi.fn();
    render(<HoldButton onConfirm={onConfirm} onHoldCancel={onHoldCancel} />);
    press();
    advance(600);
    lift();
    expect(onHoldCancel).toHaveBeenCalledOnce();
    expect(button()).toHaveAttribute("data-state", "draining");
    const released = progress();
    advance(48);
    expect(progress()).toBeLessThan(released);
    expect(progress()).toBeGreaterThan(0);
    const resumed = progress();
    press();
    advance(Math.ceil((1 - resumed) * 1200) - 40);
    expect(onConfirm).not.toHaveBeenCalled();
    advance(60);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("drains all the way to rest", () => {
    render(<HoldButton />);
    press();
    advance(300);
    fireEvent.pointerLeave(button());
    advance(1000);
    expect(progress()).toBe(0);
    expect(button()).toHaveAttribute("data-state", "idle");
  });

  it("ignores a secondary button and a prevented press", () => {
    const onHoldStart = vi.fn();
    const { rerender } = render(<HoldButton onHoldStart={onHoldStart} />);
    fireEvent.pointerDown(button(), { button: 2 });
    expect(onHoldStart).not.toHaveBeenCalled();
    rerender(
      <HoldButton
        onHoldStart={onHoldStart}
        onPointerDown={(event) => {
          event.preventDefault();
        }}
      />,
    );
    press();
    expect(onHoldStart).not.toHaveBeenCalled();
    lift();
  });

  it("lets go when the pointer is cancelled", () => {
    const onHoldCancel = vi.fn();
    render(<HoldButton onHoldCancel={onHoldCancel} />);
    press();
    advance(100);
    fireEvent.pointerCancel(button());
    expect(onHoldCancel).toHaveBeenCalledOnce();
  });

  it("confirms when Enter or Space is held, ignoring repeats and other keys", () => {
    const onConfirm = vi.fn();
    render(<HoldButton onConfirm={onConfirm} holdDuration={400} resetAfter={100} />);
    fireEvent.keyDown(button(), { key: "a" });
    expect(button()).toHaveAttribute("data-state", "idle");
    fireEvent.keyDown(button(), { key: "Enter" });
    expect(button()).toHaveAttribute("data-state", "holding");
    advance(200);
    fireEvent.keyDown(button(), { key: "Enter", repeat: true });
    fireEvent.keyUp(button(), { key: " " });
    expect(button()).toHaveAttribute("data-state", "holding");
    advance(220);
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.keyUp(button(), { key: "Enter" });

    advance(1000);
    expect(button()).toHaveAttribute("data-state", "idle");
    fireEvent.keyDown(button(), { key: " " });
    advance(420);
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("drains when the key is released early", () => {
    const onHoldCancel = vi.fn();
    render(<HoldButton onHoldCancel={onHoldCancel} />);
    fireEvent.keyDown(button(), { key: " " });
    advance(300);
    fireEvent.keyUp(button(), { key: " " });
    expect(onHoldCancel).toHaveBeenCalledOnce();
    expect(button()).toHaveAttribute("data-state", "draining");
  });

  it("lets go of a key hold when focus leaves", () => {
    const onConfirm = vi.fn();
    render(<HoldButton onConfirm={onConfirm} />);
    fireEvent.keyDown(button(), { key: "Enter" });
    advance(300);
    fireEvent.blur(button());
    advance(2000);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does nothing on a plain click", () => {
    const onConfirm = vi.fn();
    const onClick = vi.fn();
    render(<HoldButton onConfirm={onConfirm} onClick={onClick} />);
    fireEvent.click(button());
    advance(2000);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("resets after resetAfter, clearing the announcement", () => {
    render(<HoldButton holdDuration={200} resetAfter={500} />);
    press();
    // Frames land every 16ms, so the 200ms hold completes on the frame at 208.
    advance(208);
    expect(button()).toHaveAttribute("data-state", "confirmed");
    lift();
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
    advance(499);
    expect(button()).toHaveAttribute("data-state", "confirmed");
    advance(1);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(button()).toHaveAttribute("data-state", "draining");
    expect(button()).not.toHaveAttribute("aria-disabled");
    advance(1000);
    expect(button()).toHaveAttribute("data-state", "idle");
    expect(progress()).toBe(0);
  });

  it("stays confirmed and ignores further holds without resetAfter", () => {
    const onHoldStart = vi.fn();
    render(<HoldButton holdDuration={100} onHoldStart={onHoldStart} />);
    press();
    advance(120);
    lift();
    press();
    expect(onHoldStart).toHaveBeenCalledOnce();
    expect(button()).toHaveAttribute("data-state", "confirmed");
  });

  it("prevents the long-press menu only while holding", () => {
    render(<HoldButton />);
    const idle = fireEvent.contextMenu(button());
    expect(idle).toBe(true);
    press();
    const held = fireEvent.contextMenu(button());
    expect(held).toBe(false);
  });

  it("does not hold when disabled, and lets go if disabled mid-hold", () => {
    const onHoldStart = vi.fn();
    const onHoldCancel = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <HoldButton disabled onHoldStart={onHoldStart} onConfirm={onConfirm} />,
    );
    expect(button()).toBeDisabled();
    fireEvent.keyDown(button(), { key: "Enter" });
    expect(onHoldStart).not.toHaveBeenCalled();
    fireEvent.keyUp(button(), { key: "Enter" });

    rerender(
      <HoldButton
        onHoldStart={onHoldStart}
        onHoldCancel={onHoldCancel}
        onConfirm={onConfirm}
      />,
    );
    press();
    advance(300);
    rerender(
      <HoldButton
        disabled
        onHoldStart={onHoldStart}
        onHoldCancel={onHoldCancel}
        onConfirm={onConfirm}
      />,
    );
    advance(2000);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onHoldCancel).toHaveBeenCalledOnce();
    expect(button()).toHaveAttribute("data-state", "idle");
    expect(progress()).toBe(0);
  });

  describe("under reduced motion", () => {
    it("still requires the whole hold, stepping the ink and showing a percentage", () => {
      mockReducedMotion();
      const onConfirm = vi.fn();
      render(<HoldButton onConfirm={onConfirm} holdDuration={1000} />);
      press();
      expect(slot("hold-button-progress")).toHaveTextContent("0%");
      expect(slot("hold-button-progress")).toHaveAttribute("data-state", "visible");
      expect(slot("hold-button-label")).toHaveAttribute("data-state", "hidden");
      advance(400);
      expect(progress()).toBe(0.25);
      expect(slot("hold-button-progress")).toHaveTextContent("25%");
      advance(200);
      expect(progress()).toBe(0.5);
      expect(button()).toHaveAccessibleName("Hold to confirm");
      advance(390);
      expect(onConfirm).not.toHaveBeenCalled();
      advance(20);
      expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("drops back to rest at once when let go", () => {
      mockReducedMotion();
      render(<HoldButton />);
      press();
      advance(700);
      lift();
      expect(progress()).toBe(0);
      expect(button()).toHaveAttribute("data-state", "idle");
      expect(slot("hold-button-label")).toHaveAttribute("data-state", "visible");
    });
  });

  it("uses custom labels, icon, hint and announcement", () => {
    render(
      <HoldButton
        label="Wipe device"
        confirmedLabel={<b>Wiped</b>}
        icon={<svg data-testid="trash" />}
        hint="Press and hold to wipe this device."
        holdDuration={100}
        aria-describedby="extra"
      />,
    );
    expect(screen.getAllByTestId("trash")).toHaveLength(2);
    expect(button()).toHaveAttribute("aria-describedby", expect.stringContaining("extra"));
    expect(button()).toHaveAccessibleDescription("Press and hold to wipe this device.");
    press();
    advance(120);
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
  });

  it("prefers an explicit announcement", () => {
    render(<HoldButton holdDuration={100} announcement="Account deleted" />);
    press();
    advance(120);
    expect(screen.getByRole("status")).toHaveTextContent("Account deleted");
  });

  it("colours the ink by variant", () => {
    const { rerender } = render(<HoldButton />);
    expect(button()).toHaveAttribute("data-variant", "default");
    expect(slot("hold-button-ink")).toHaveClass("bg-primary", "text-primary-foreground");
    rerender(<HoldButton variant="destructive" />);
    expect(button()).toHaveClass("text-destructive");
    expect(slot("hold-button-ink")).toHaveClass(
      "bg-destructive",
      "text-destructive-foreground",
    );
  });

  it("passes the size to the button", () => {
    const { rerender } = render(<HoldButton size="sm" />);
    expect(button()).toHaveClass("h-8");
    rerender(<HoldButton size="lg" />);
    expect(button()).toHaveClass("h-10");
  });

  it("lets a consumer className win and forwards ref, props and handlers", () => {
    const ref = createRef<HTMLButtonElement>();
    const handlers = {
      onPointerDown: vi.fn(),
      onPointerUp: vi.fn(),
      onPointerLeave: vi.fn(),
      onPointerCancel: vi.fn(),
      onKeyDown: vi.fn(),
      onKeyUp: vi.fn(),
      onBlur: vi.fn(),
      onContextMenu: vi.fn(),
    };
    render(
      <HoldButton ref={ref} className="h-12 rounded-full" data-testid="hold" {...handlers} />,
    );
    const control = screen.getByTestId("hold");
    expect(ref.current).toBe(control);
    expect(control).toHaveClass("h-12", "rounded-full");
    expect(control).not.toHaveClass("h-9", "rounded-md");
    press();
    lift();
    fireEvent.pointerLeave(control);
    fireEvent.pointerCancel(control);
    fireEvent.keyDown(control, { key: "x" });
    fireEvent.keyUp(control, { key: "x" });
    fireEvent.blur(control);
    fireEvent.contextMenu(control);
    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalled();
  });

  it("stops its clock on unmount", () => {
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const { unmount } = render(<HoldButton />);
    press();
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const { container } = render(<HoldButton label="Delete" variant="destructive" />);
    await expectNoA11yViolations(container);
    await user.tab();
    await expectNoA11yViolations(container);
  });
});
