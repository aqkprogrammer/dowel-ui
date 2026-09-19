import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { createRef } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DirectionProvider } from "@/components/direction";

import { expectNoA11yViolations } from "../../../test/a11y";
import { GooBall, gooBallSpring } from "./goo-ball";

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
beforeEach(() => {
  // A 300x200 well: at size 56 the travel is 244 x 144.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 300, 200),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
});

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

function handle() {
  return screen.getByRole("slider");
}

function centre(element: Element | null) {
  const match = /^translate\(([-\d.]+) ([-\d.]+)\)/.exec(
    element?.getAttribute("transform") ?? "",
  );
  return match ? [Number(match[1]), Number(match[2])] : [NaN, NaN];
}

function blob() {
  return document.querySelector('[data-slot="goo-ball-blob"]');
}

describe("GooBall", () => {
  it("is a labelled, decorative 2D slider centred by default", () => {
    render(<GooBall />);
    const slider = screen.getByRole("slider", { name: "Goo ball (decorative)" });
    expect(slider).toHaveAttribute("aria-roledescription", "draggable ball");
    expect(slider).toHaveAttribute("aria-valuetext", "50% across, 50% down");
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    expect(slider).toHaveAttribute("tabindex", "0");
    expect(document.querySelector('[data-slot="goo-ball-goo"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("nudges with the arrow keys, further with Shift, and Home centres", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<GooBall onValueChange={onValueChange} />);
    handle().focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith({ x: 52, y: 50 });
    await user.keyboard("{ArrowDown}");
    expect(handle()).toHaveAttribute("aria-valuetext", "52% across, 52% down");
    await user.keyboard("{Shift>}{ArrowLeft}{ArrowUp}{/Shift}");
    expect(handle()).toHaveAttribute("aria-valuetext", "42% across, 42% down");
    await user.keyboard("{Home}");
    expect(handle()).toHaveAttribute("aria-valuetext", "50% across, 50% down");
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledTimes(5);
  });

  it("clamps to the well and reports nothing when a wall stops it", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<GooBall defaultValue={{ x: 0, y: 150 }} onValueChange={onValueChange} />);
    expect(handle()).toHaveAttribute("aria-valuetext", "0% across, 100% down");
    handle().focus();
    await user.keyboard("{ArrowLeft}{ArrowDown}");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("mirrors horizontal keys in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider dir="rtl">
        <div dir="rtl">
          <GooBall />
        </div>
      </DirectionProvider>,
    );
    handle().focus();
    await user.keyboard("{ArrowRight}");
    expect(handle()).toHaveAttribute("aria-valuetext", "48% across, 50% down");
  });

  it("follows a pointer drag 1:1 and stays where it is dropped", () => {
    const onValueChange = vi.fn();
    render(<GooBall onValueChange={onValueChange} />);
    const slider = handle();
    fireEvent.pointerDown(slider, { pointerId: 1, button: 0, clientX: 150, clientY: 100 });
    expect(document.querySelector('[data-slot="goo-ball"]')).toHaveAttribute("data-held");
    expect(slider).toHaveFocus();
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 150 + 24.4, clientY: 100 - 14.4 });
    expect(slider).toHaveAttribute("aria-valuetext", "60% across, 40% down");
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 9999, clientY: 9999 });
    expect(onValueChange).toHaveBeenLastCalledWith({ x: 100, y: 100 });
    fireEvent.pointerUp(slider, { pointerId: 1 });
    expect(document.querySelector('[data-slot="goo-ball"]')).not.toHaveAttribute("data-held");
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 0, clientY: 0 });
    expect(slider).toHaveAttribute("aria-valuetext", "100% across, 100% down");
  });

  it("ignores other pointers and secondary buttons", () => {
    const onValueChange = vi.fn();
    render(<GooBall onValueChange={onValueChange} />);
    const slider = handle();
    fireEvent.pointerDown(slider, { pointerId: 1, button: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 50, clientY: 0 });
    fireEvent.pointerDown(slider, { pointerId: 2, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(slider, { pointerId: 3, clientX: 50, clientY: 0 });
    fireEvent.pointerUp(slider, { pointerId: 3 });
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.pointerCancel(slider, { pointerId: 2 });
    expect(document.querySelector('[data-slot="goo-ball"]')).not.toHaveAttribute("data-held");
  });

  it("drags toward the inline end in right-to-left layouts", () => {
    render(
      <div dir="rtl">
        <GooBall />
      </div>,
    );
    const slider = handle();
    fireEvent.pointerDown(slider, { pointerId: 1, button: 0, clientX: 150, clientY: 100 });
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 150 - 24.4, clientY: 100 });
    expect(slider).toHaveAttribute("aria-valuetext", "60% across, 50% down");
  });

  it("is controllable", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <GooBall value={{ x: 10, y: 20 }} onValueChange={onValueChange} />,
    );
    handle().focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith({ x: 12, y: 20 });
    expect(handle()).toHaveAttribute("aria-valuetext", "10% across, 20% down");
    rerender(<GooBall value={{ x: 70, y: 80 }} onValueChange={onValueChange} />);
    expect(handle()).toHaveAttribute("aria-valuetext", "70% across, 80% down");
  });

  it("does nothing when disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<GooBall disabled onValueChange={onValueChange} />);
    const slider = handle();
    expect(slider).toHaveAttribute("aria-disabled", "true");
    expect(slider).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.pointerDown(slider, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 80, clientY: 0 });
    await user.click(slider);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("draws the blob under the handle once it settles", async () => {
    const user = userEvent.setup();
    render(<GooBall stroke fill="dark" />);
    const rect = blob();
    expect(rect).toHaveClass("fill-foreground", "stroke-border");
    expect(rect).toHaveAttribute("rx", "28");
    await waitFor(() => {
      const [x, y] = centre(rect);
      expect(x).toBeCloseTo(150, 1);
      expect(y).toBeCloseTo(100, 1);
    });
    handle().focus();
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    // 60% of 244px travel, plus half the ball.
    await waitFor(() => {
      expect(centre(rect)[0]).toBeCloseTo(174.4, 1);
    });
  });

  it("under reduced motion sits exactly at the handle, round, with no stretch", async () => {
    mockReducedMotion();
    const user = userEvent.setup();
    render(<GooBall stretch={70} />);
    const rect = blob();
    handle().focus();
    await user.keyboard(
      "{Home}{Shift>}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{/Shift}",
    );
    expect(rect).toHaveAttribute(
      "transform",
      "translate(28.000 100.000) scale(1.000 1.000) rotate(0.000) scale(1.000 1.000) rotate(0.000) translate(-28.000 -28.000)",
    );
  });

  it("maps the feel props onto the spring", () => {
    expect(gooBallSpring(50, 50)).toEqual({ stiffness: 500, damping: 18, mass: 1 });
    const loose = gooBallSpring(100, 0);
    const tight = gooBallSpring(10, 100);
    expect(loose.stiffness).toBeLessThan(tight.stiffness);
    expect(loose.mass).toBeGreaterThan(tight.mass);
    expect(gooBallSpring(0, 200)).toEqual(gooBallSpring(10, 100));
  });

  it("lets the consumer's className size the well and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<GooBall ref={ref} className="h-40 w-96" />);
    expect(ref.current).toBe(document.querySelector('[data-slot="goo-ball"]'));
    expect(ref.current).toHaveClass("h-40", "w-96");
    expect(ref.current).not.toHaveClass("h-[12.5rem]");
    expect(ref.current).not.toHaveClass("w-[18.75rem]");
  });

  it("can be named by another element", () => {
    render(
      <>
        <span id="goo-name">Toy</span>
        <GooBall aria-labelledby="goo-name" />
      </>,
    );
    expect(screen.getByRole("slider", { name: "Toy" })).not.toHaveAttribute("aria-label");
  });

  it("has no axe violations", async () => {
    const { container } = render(<GooBall />);
    await expectNoA11yViolations(container);
  });
});
