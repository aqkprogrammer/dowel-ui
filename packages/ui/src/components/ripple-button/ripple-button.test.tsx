import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { RippleButton } from "./ripple-button";

function ripples(button: HTMLElement) {
  return [...button.querySelectorAll<HTMLElement>('[data-slot="ripple-button-ripple"]')];
}

function measure(button: HTMLElement) {
  vi.spyOn(button, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 100, y: 50, width: 120, height: 40 }),
  );
}

/** jsdom has no AnimationEvent, so React listens for the WebKit-prefixed name; send both. */
function ended(element: Element) {
  for (const type of ["animationend", "webkitAnimationEnd"]) {
    fireEvent(element, new Event(type, { bubbles: true }));
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("RippleButton", () => {
  it("renders a named button with an empty, hidden ripple layer", () => {
    render(<RippleButton>Save</RippleButton>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("data-slot", "ripple-button");
    const layer = button.querySelector('[data-slot="ripple-button-ripples"]');
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer).toHaveClass("pointer-events-none");
    expect(ripples(button)).toHaveLength(0);
  });

  it("ripples from the pointer, sized to reach the farthest corner", () => {
    render(<RippleButton>Save</RippleButton>);
    const button = screen.getByRole("button");
    measure(button);
    fireEvent.pointerDown(button, { button: 0, clientX: 110, clientY: 60 });
    const [ripple] = ripples(button);
    // Pressed 10px in from the top-start corner: the farthest is the opposite one.
    const radius = Math.hypot(110, 30);
    expect(ripple?.style.width).toBe(`${String(radius * 2)}px`);
    expect(ripple?.style.left).toBe(`${String(10 - radius)}px`);
    expect(ripple?.style.top).toBe(`${String(10 - radius)}px`);
  });

  it("stacks concurrent ripples and removes each when it finishes", () => {
    render(<RippleButton>Save</RippleButton>);
    const button = screen.getByRole("button");
    fireEvent.pointerDown(button, { button: 0 });
    fireEvent.pointerDown(button, { button: 0 });
    fireEvent.pointerDown(button, { button: 0 });
    expect(ripples(button)).toHaveLength(3);
    const [first] = ripples(button);
    if (first) ended(first);
    expect(ripples(button)).toHaveLength(2);
  });

  it("removes ripples that never report animationend", () => {
    vi.useFakeTimers();
    render(<RippleButton>Save</RippleButton>);
    const button = screen.getByRole("button");
    fireEvent.pointerDown(button, { button: 0 });
    expect(ripples(button)).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(ripples(button)).toHaveLength(0);
  });

  it("clears pending timers on unmount", () => {
    vi.useFakeTimers();
    const clear = vi.spyOn(globalThis, "clearTimeout");
    const { unmount } = render(<RippleButton>Save</RippleButton>);
    fireEvent.pointerDown(screen.getByRole("button"), { button: 0 });
    unmount();
    expect(clear).toHaveBeenCalled();
  });

  it("ripples from the centre on Enter and Space", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<RippleButton onClick={onClick}>Save</RippleButton>);
    const button = screen.getByRole("button");
    measure(button);
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    const shown = ripples(button);
    expect(shown).toHaveLength(2);
    const radius = Math.hypot(60, 20);
    expect(shown[0]?.style.left).toBe(`${String(60 - radius)}px`);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("ignores other keys, repeats and secondary buttons", () => {
    render(<RippleButton>Save</RippleButton>);
    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "a" });
    fireEvent.keyDown(button, { key: "Enter", repeat: true });
    fireEvent.pointerDown(button, { button: 2 });
    expect(ripples(button)).toHaveLength(0);
  });

  it("runs consumer handlers first and respects preventDefault", () => {
    const onPointerDown = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    const onKeyDown = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    render(
      <RippleButton onPointerDown={onPointerDown} onKeyDown={onKeyDown}>
        Save
      </RippleButton>,
    );
    const button = screen.getByRole("button");
    fireEvent.pointerDown(button, { button: 0 });
    fireEvent.keyDown(button, { key: "Enter" });
    expect(onPointerDown).toHaveBeenCalled();
    expect(onKeyDown).toHaveBeenCalled();
    expect(ripples(button)).toHaveLength(0);
  });

  it("does not ripple while disabled or loading", () => {
    const { rerender } = render(<RippleButton disabled>Save</RippleButton>);
    fireEvent.pointerDown(screen.getByRole("button"), { button: 0 });
    expect(ripples(screen.getByRole("button"))).toHaveLength(0);
    expect(screen.getByRole("button")).toBeDisabled();

    rerender(<RippleButton loading>Save</RippleButton>);
    const button = screen.getByRole("button");
    fireEvent.pointerDown(button, { button: 0 });
    expect(ripples(button)).toHaveLength(0);
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it.each([
    ["auto", "[--ripple-button-tone:currentColor]"],
    ["primary", "[--ripple-button-tone:var(--color-primary)]"],
    ["primary-foreground", "[--ripple-button-tone:var(--color-primary-foreground)]"],
    ["foreground", "[--ripple-button-tone:var(--color-foreground)]"],
    ["background", "[--ripple-button-tone:var(--color-background)]"],
    ["success", "[--ripple-button-tone:var(--color-success)]"],
    ["destructive", "[--ripple-button-tone:var(--color-destructive)]"],
  ] as const)("applies the %s ripple tone", (rippleTone, className) => {
    render(<RippleButton rippleTone={rippleTone}>Save</RippleButton>);
    expect(screen.getByRole("button")).toHaveClass(className);
  });

  it.each([
    ["primary", "bg-primary"],
    ["secondary", "bg-secondary"],
    ["outline", "border-input"],
    ["ghost", "hover:bg-accent"],
    ["destructive", "bg-destructive"],
    ["soft", "text-primary"],
    ["gradient", "bg-linear-to-b"],
  ] as const)("mirrors the %s Button variant", (variant, className) => {
    render(<RippleButton variant={variant}>Save</RippleButton>);
    expect(screen.getByRole("button")).toHaveClass(className, "overflow-hidden");
  });

  it.each([
    ["sm", "h-8"],
    ["md", "h-9"],
    ["lg", "h-10"],
  ] as const)("applies the %s size", (size, height) => {
    render(<RippleButton size={size}>Save</RippleButton>);
    expect(screen.getByRole("button")).toHaveClass(height);
  });

  it("presses with Button's scale", () => {
    render(<RippleButton>Save</RippleButton>);
    expect(screen.getByRole("button")).toHaveClass("motion-safe:active:scale-[0.97]");
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <RippleButton ref={ref} className="rounded-full px-8" data-testid="ripple" type="submit">
        Save
      </RippleButton>,
    );
    const button = screen.getByTestId("ripple");
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("rounded-full", "px-8");
    expect(button).not.toHaveClass("rounded-md", "px-4");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("has no accessibility violations, mid-ripple included", async () => {
    const { container } = render(<RippleButton>Save</RippleButton>);
    await expectNoA11yViolations(container);
    fireEvent.pointerDown(screen.getByRole("button"), { button: 0 });
    await expectNoA11yViolations(container);
  });
});
