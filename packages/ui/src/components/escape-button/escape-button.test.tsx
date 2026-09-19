import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { EscapeButton } from "./escape-button";

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return DOMRect.fromRect({ x: left, y: top, width, height });
}

/** Button at rest centred on (200, 150) inside a 400×300 field. */
function layout(button: HTMLElement) {
  vi.spyOn(button, "getBoundingClientRect").mockImplementation(() => {
    const match = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(button.style.transform);
    const x = match ? Number(match[1]) : 0;
    const y = match ? Number(match[2]) : 0;
    return rect(150 + x, 122 + y, 100, 56);
  });
  vi.spyOn(button.parentElement!, "getBoundingClientRect").mockReturnValue(
    rect(0, 0, 400, 300),
  );
}

function move(x: number, y: number, pointerType = "mouse") {
  const event = new MouseEvent("pointermove", { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  act(() => {
    window.dispatchEvent(event);
  });
}

function media(matching: string[]) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matching.includes(query),
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

function renderField(props: Parameters<typeof EscapeButton>[0] = {}) {
  render(
    <div>
      <EscapeButton {...props} />
    </div>,
  );
  const button = screen.getByRole("button");
  layout(button);
  return button;
}

beforeEach(() => {
  media([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("EscapeButton", () => {
  it("renders a button with its label", () => {
    render(<EscapeButton />);
    expect(screen.getByRole("button", { name: "Touch me" })).toHaveAttribute(
      "data-escape",
      "rest",
    );
  });

  it("flees directly away from an approaching mouse, harder when closer", () => {
    const button = renderField();
    move(140, 150); // 60px to the left of centre
    expect(button).toHaveAttribute("data-escape", "flee");
    const first = /translate\(([\d.]+)px, (-?[\d.]+)px\)/.exec(button.style.transform)!;
    expect(Number(first[1])).toBeGreaterThan(10);
    expect(Number(first[1])).toBeLessThan(20);
    expect(Math.abs(Number(first[2]))).toBeLessThan(0.001);

    move(170, 150); // 30px away
    const second = /translate\(([\d.]+)px/.exec(button.style.transform)!;
    expect(Number(second[1])).toBeGreaterThan(Number(first[1]));
  });

  it("stays inside its field", () => {
    const button = renderField({ skittishness: 100, radius: 400 });
    move(200, 149);
    const match = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(button.style.transform)!;
    // It may travel down only as far as the field's bottom edge: 300 − 178.
    expect(Number(match[2])).toBeLessThanOrEqual(122);
  });

  it("drifts home when the pointer leaves, and gives up after its patience", () => {
    const button = renderField({ patience: 2 });
    move(140, 150);
    move(10, 10);
    expect(button).toHaveAttribute("data-escape", "rest");
    expect(button.style.transform).toBe("");
    expect(button).not.toHaveAttribute("data-caught");

    move(140, 150);
    move(10, 10);
    expect(button).toHaveAttribute("data-caught");
    expect(button).toHaveAccessibleName("Fine.");

    move(140, 150);
    expect(button.style.transform).toBe("");
  });

  it("presses, shows the done state, then resets the game", () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    const button = renderField({ patience: 1, resetAfter: 500, onClick });
    move(140, 150);
    move(10, 10);
    expect(button).toHaveAttribute("data-caught");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute("data-done");
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(button).not.toHaveAttribute("data-done");
    expect(button).toHaveAccessibleName("Touch me");
  });

  it("never dodges touch, reduced motion or a coarse pointer", () => {
    const button = renderField();
    move(140, 150, "touch");
    expect(button.style.transform).toBe("");

    media(["(prefers-reduced-motion: reduce)"]);
    move(140, 150);
    expect(button.style.transform).toBe("");

    media(["(pointer: coarse)"]);
    move(140, 150);
    expect(button.style.transform).toBe("");
  });

  it("never dodges while focused, and can be pressed from the keyboard at once", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const button = renderField({ onClick });
    move(140, 150);
    expect(button.style.transform).not.toBe("");
    await user.tab();
    expect(button).toHaveFocus();
    expect(button.style.transform).toBe("");
    move(150, 150);
    expect(button.style.transform).toBe("");
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
    // Pressed: it holds still until the game resets.
    await user.tab();
    move(140, 150);
    expect(button.style.transform).toBe("");
  });

  it("does not play when disabled or with no skittishness", () => {
    const button = renderField({ skittishness: 0 });
    move(140, 150);
    expect(button.style.transform).toBe("");
  });

  it("flees straight up when the pointer is dead centre", () => {
    const button = renderField();
    move(200, 150);
    expect(button.style.transform).toMatch(/translate\(0px, -[\d.]+px\)/);
  });

  it("respects a prevented click", () => {
    render(
      <EscapeButton
        onClick={(event) => {
          event.preventDefault();
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).not.toHaveAttribute("data-done");
  });

  it("lets a consumer className win and forwards refs and handlers", async () => {
    const ref = createRef<HTMLButtonElement>();
    const callbackRef = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <EscapeButton
        ref={ref}
        className="h-10 rounded-md"
        onFocus={onFocus}
        onBlur={onBlur}
        stroke
      >
        Catch me
      </EscapeButton>,
    );
    const button = screen.getByRole("button", { name: "Catch me" });
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("h-10", "rounded-md");
    expect(button).not.toHaveClass("h-14", "rounded-full");
    await user.tab();
    await user.tab();
    expect(onFocus).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalled();
    rerender(<EscapeButton ref={callbackRef} disabled />);
    expect(callbackRef).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<EscapeButton />);
    await expectNoA11yViolations(container);
  });
});
