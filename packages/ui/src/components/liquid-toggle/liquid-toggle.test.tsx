import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type * as MotionModule from "motion/react";

import { expectNoA11yViolations } from "../../../test/a11y";
import { LiquidToggle } from "./liquid-toggle";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof MotionModule>()),
  useReducedMotion: () => motionPreference.reduced,
}));

afterEach(() => {
  motionPreference.reduced = false;
  vi.restoreAllMocks();
});

function knob(toggle: HTMLElement) {
  return toggle.querySelector<HTMLElement>('[data-slot="liquid-toggle-knob"]')!;
}

function position(toggle: HTMLElement) {
  return Number(knob(toggle).style.getPropertyValue("--liquid-toggle-p"));
}

/** A 92px track with a 36px knob inset 5px: 46px of travel. */
function measure(toggle: HTMLElement) {
  vi.spyOn(toggle, "clientWidth", "get").mockReturnValue(92);
  vi.spyOn(knob(toggle), "offsetWidth", "get").mockReturnValue(36);
  vi.spyOn(knob(toggle), "offsetLeft", "get").mockReturnValue(5);
}

function dragBy(toggle: HTMLElement, dx: number) {
  fireEvent.pointerDown(toggle, { pointerId: 1, button: 0, clientX: 100 });
  fireEvent.pointerMove(toggle, { pointerId: 1, clientX: 100 + dx / 2 });
  fireEvent.pointerMove(toggle, { pointerId: 1, clientX: 100 + dx });
  fireEvent.pointerUp(toggle, { pointerId: 1, clientX: 100 + dx });
  fireEvent.click(toggle);
}

describe("LiquidToggle", () => {
  it("renders a named switch with a decorative knob", () => {
    render(<LiquidToggle aria-label="Liquid toggle" />);
    const toggle = screen.getByRole("switch", { name: "Liquid toggle" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(knob(toggle)).toHaveAttribute("aria-hidden", "true");
    expect(position(toggle)).toBe(0);
  });

  it("toggles on click and springs the knob across", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<LiquidToggle aria-label="Wi-Fi" onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole("switch");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    await waitFor(() => {
      expect(position(toggle)).toBeGreaterThan(0.99);
    });
  });

  it("toggles with Space and Enter", async () => {
    const user = userEvent.setup();
    render(<LiquidToggle aria-label="Wi-Fi" />);
    await user.tab();
    await user.keyboard(" ");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("jumps without springing under reduced motion", async () => {
    motionPreference.reduced = true;
    const user = userEvent.setup();
    render(<LiquidToggle aria-label="Wi-Fi" />);
    const toggle = screen.getByRole("switch");
    await user.click(toggle);
    expect(position(toggle)).toBe(1);
  });

  it("follows the pointer while dragged and sets the nearer side on release", async () => {
    const onCheckedChange = vi.fn();
    render(<LiquidToggle aria-label="Wi-Fi" onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole("switch");
    measure(toggle);

    fireEvent.pointerDown(toggle, { pointerId: 1, button: 0, clientX: 100 });
    fireEvent.pointerMove(toggle, { pointerId: 1, clientX: 101 }); // inside the slop
    expect(position(toggle)).toBe(0);
    fireEvent.pointerMove(toggle, { pointerId: 1, clientX: 123 });
    await waitFor(() => {
      expect(position(toggle)).toBeCloseTo(0.5);
    });
    fireEvent.pointerMove(toggle, { pointerId: 1, clientX: 200 });
    await waitFor(() => {
      expect(position(toggle)).toBe(1);
    });
    fireEvent.pointerUp(toggle, { pointerId: 1 });
    // The click that ends a drag does not toggle again.
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("springs back when a drag ends on the side it started", async () => {
    motionPreference.reduced = true;
    render(<LiquidToggle aria-label="Wi-Fi" />);
    const toggle = screen.getByRole("switch");
    measure(toggle);
    dragBy(toggle, 15);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await waitFor(() => {
      expect(position(toggle)).toBe(0);
    });
  });

  it("mirrors the drag in right-to-left layouts", () => {
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <LiquidToggle aria-label="Wi-Fi" />
      </div>,
    );
    const toggle = screen.getByRole("switch");
    vi.spyOn(toggle, "clientWidth", "get").mockReturnValue(92);
    vi.spyOn(knob(toggle), "offsetWidth", "get").mockReturnValue(36);
    vi.spyOn(knob(toggle), "offsetLeft", "get").mockReturnValue(51);
    dragBy(toggle, -40);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("does not drag when disabled, unmeasured, cancelled or with another button", () => {
    const { rerender } = render(<LiquidToggle aria-label="Wi-Fi" />);
    const toggle = screen.getByRole("switch");
    // Unmeasured: the knob stays put and the release is a no-op drag.
    fireEvent.pointerDown(toggle, { pointerId: 1, button: 0, clientX: 0 });
    fireEvent.pointerMove(toggle, { pointerId: 2, clientX: 50 });
    fireEvent.pointerMove(toggle, { pointerId: 1, clientX: 50 });
    expect(position(toggle)).toBe(0);
    fireEvent.pointerCancel(toggle, { pointerId: 1 });
    fireEvent.pointerDown(toggle, { pointerId: 1, button: 2, clientX: 0 });
    fireEvent.pointerUp(toggle, { pointerId: 1 });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    rerender(<LiquidToggle aria-label="Wi-Fi" disabled />);
    fireEvent.pointerDown(toggle, { pointerId: 1, button: 0, clientX: 0 });
    fireEvent.click(toggle);
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("follows the controlled prop and only requests changes", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <LiquidToggle aria-label="Wi-Fi" checked={false} onCheckedChange={onCheckedChange} />,
    );
    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    rerender(<LiquidToggle aria-label="Wi-Fi" checked onCheckedChange={onCheckedChange} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("works as a controlled pair and starts from defaultChecked", async () => {
    function Controlled() {
      const [on, setOn] = useState(true);
      return <LiquidToggle aria-label="Wi-Fi" checked={on} onCheckedChange={setOn} />;
    }
    const user = userEvent.setup();
    render(<Controlled />);
    const toggle = screen.getByRole("switch");
    expect(position(toggle)).toBe(1);
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("submits its value inside a form", () => {
    const { container } = render(
      <form>
        <LiquidToggle aria-label="Wi-Fi" name="wifi" defaultChecked />
      </form>,
    );
    expect(container.querySelector('input[name="wifi"]')).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards ref and handlers", () => {
    const ref = createRef<HTMLButtonElement>();
    const handlers = {
      onClick: vi.fn(),
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
      onPointerCancel: vi.fn(),
    };
    render(
      <LiquidToggle
        ref={ref}
        aria-label="Wi-Fi"
        className="h-8 bg-muted"
        size="sm"
        stroke={false}
        speed={100}
        stretch={0}
        {...handlers}
      />,
    );
    const toggle = screen.getByRole("switch");
    expect(ref.current).toBe(toggle);
    expect(toggle).toHaveClass("h-8", "bg-muted");
    expect(toggle).not.toHaveClass("h-6", "bg-card");
    fireEvent.pointerDown(toggle, { pointerId: 1, button: 0 });
    fireEvent.pointerMove(toggle, { pointerId: 1 });
    fireEvent.pointerUp(toggle, { pointerId: 1 });
    fireEvent.pointerCancel(toggle, { pointerId: 1 });
    fireEvent.click(toggle);
    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <LiquidToggle aria-label="Wi-Fi" />
        <LiquidToggle aria-label="Bluetooth" defaultChecked />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
