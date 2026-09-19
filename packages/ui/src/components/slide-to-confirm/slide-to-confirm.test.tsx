import { act, fireEvent, render, screen } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { createRef } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DirectionProvider } from "@/components/direction";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SlideToConfirm, slideSpring } from "./slide-to-confirm";

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

/** A 280px track and a 48px grip: 224px of travel. */
function mockGeometry() {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element,
  ) {
    const width = this.getAttribute("data-slot") === "slide-to-confirm-grip" ? 48 : 280;
    return new DOMRect(0, 0, width, 48);
  });
}

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

beforeEach(() => {
  // Only the component's own timers: motion's frame loop must keep real frames,
  // or a spring started under fake time stalls the loop for later tests.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  mockGeometry();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const grip = (name = "Slide to confirm") => screen.getByRole("button", { name });
const root = () => document.querySelector<HTMLElement>('[data-slot="slide-to-confirm"]')!;
const advance = (ms: number) => {
  void act(() => {
    vi.advanceTimersByTime(ms);
  });
};
/** Where the grip sits; springs finish on the next frames. */
/** Springs run on motion's frame loop, which fake timers do not drive: wait in real time. */
const wait = (ms = 60) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
const at = () => root().style.getPropertyValue("--slide-x") || "0px";
const pointer = { button: 0, pointerId: 1 };

function drag(to: number) {
  const element = document.querySelector<HTMLElement>('[data-slot="slide-to-confirm-grip"]')!;
  const start = to > 0 ? 10 : -10;
  fireEvent.pointerDown(element, { ...pointer, clientX: 0 });
  fireEvent.pointerMove(element, { ...pointer, clientX: start });
  fireEvent.pointerMove(element, { ...pointer, clientX: start + to });
}

describe("SlideToConfirm", () => {
  it("is a named button described by its instructions", () => {
    render(<SlideToConfirm />);
    expect(grip()).toHaveAccessibleDescription(
      "Drag to the end, or press and hold Enter or Space.",
    );
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(root()).toHaveAttribute("data-state", "idle");
    expect(root()).toHaveAttribute("data-variant", "confirm");
    expect(screen.getByText("Slide to confirm")).toBeInTheDocument();
  });

  it("confirms when Enter is held for holdDuration, announces it and resets", () => {
    const onConfirm = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} />);
    fireEvent.keyDown(grip(), { key: "Enter" });
    expect(root()).toHaveAttribute("data-state", "holding");
    advance(999);
    expect(onConfirm).not.toHaveBeenCalled();
    advance(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(root()).toHaveAttribute("data-state", "confirmed");
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
    expect(grip()).toHaveAttribute("aria-disabled", "true");
    fireEvent.keyUp(grip(), { key: "Enter" });
    advance(1100);
    expect(root()).toHaveAttribute("data-state", "idle");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("springs back when Space is released early, and ignores repeats and other keys", () => {
    const onConfirm = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} holdDuration={600} />);
    fireEvent.keyDown(grip(), { key: "a" });
    expect(root()).toHaveAttribute("data-state", "idle");
    fireEvent.keyDown(grip(), { key: " " });
    advance(300);
    fireEvent.keyDown(grip(), { key: " ", repeat: true });
    fireEvent.keyUp(grip(), { key: "Enter" });
    expect(root()).toHaveAttribute("data-state", "holding");
    fireEvent.keyUp(grip(), { key: " " });
    expect(root()).toHaveAttribute("data-state", "idle");
    advance(2000);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(at()).toBe("0px");
  });

  it("lets go of a hold when focus leaves", () => {
    const onConfirm = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} />);
    fireEvent.keyDown(grip(), { key: "Enter" });
    fireEvent.blur(grip());
    advance(2000);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.blur(grip());
    expect(root()).toHaveAttribute("data-state", "idle");
  });

  it("confirms on a still pointer press held long enough", () => {
    const onConfirm = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} />);
    fireEvent.pointerDown(grip(), { ...pointer, clientX: 0 });
    fireEvent.pointerMove(grip(), { ...pointer, clientX: 2 });
    advance(180);
    expect(root()).toHaveAttribute("data-state", "holding");
    advance(1000);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(grip(), { ...pointer, clientX: 2 });
    expect(root()).toHaveAttribute("data-state", "confirmed");
  });

  it("returns a pointer hold released early, and ignores a plain click", () => {
    const onConfirm = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} />);
    fireEvent.pointerDown(grip(), { ...pointer, clientX: 0 });
    fireEvent.pointerUp(grip(), { ...pointer, clientX: 0 });
    expect(root()).toHaveAttribute("data-state", "idle");
    fireEvent.pointerDown(grip(), { ...pointer, clientX: 0 });
    advance(500);
    fireEvent.pointerUp(grip(), { ...pointer, clientX: 0 });
    expect(root()).toHaveAttribute("data-state", "idle");
    advance(2000);
    expect(onConfirm).not.toHaveBeenCalled();
    // Other buttons and stray pointers are ignored.
    fireEvent.pointerDown(grip(), { button: 2, pointerId: 3, clientX: 0 });
    fireEvent.pointerMove(grip(), { pointerId: 4, clientX: 90 });
    fireEvent.pointerUp(grip(), { pointerId: 4, clientX: 90 });
    expect(root()).toHaveAttribute("data-state", "idle");
  });

  it("follows a drag, clamped, and confirms when released at the end", async () => {
    vi.useRealTimers();
    const onConfirm = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} />);
    drag(112);
    expect(root()).toHaveAttribute("data-state", "dragging");
    expect(root().style.getPropertyValue("--slide-x")).toBe("112px");
    expect(root().style.getPropertyValue("--slide-p")).toBe("0.5");
    fireEvent.pointerMove(grip(), { ...pointer, clientX: 400 });
    expect(root().style.getPropertyValue("--slide-x")).toBe("224px");
    fireEvent.pointerUp(grip(), { ...pointer, clientX: 400 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(root()).toHaveAttribute("data-state", "confirmed");
    // The confirm grip morphs from the start of the track.
    await wait();
    expect(at()).toBe("0px");
  });

  it("springs back when a drag is released before the end or cancelled", async () => {
    vi.useRealTimers();
    const onConfirm = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} />);
    drag(120);
    fireEvent.pointerUp(grip(), { ...pointer, clientX: 130 });
    expect(root()).toHaveAttribute("data-state", "idle");
    await wait();
    expect(at()).toBe("0px");
    drag(300);
    fireEvent.pointerCancel(grip(), { ...pointer, clientX: 310 });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("travels toward the inline end in right-to-left layouts", () => {
    const onConfirm = vi.fn();
    render(
      <div dir="rtl">
        <SlideToConfirm onConfirm={onConfirm} />
      </div>,
    );
    drag(100);
    expect(at()).toBe("0px");
    fireEvent.pointerUp(grip(), { ...pointer, clientX: 110 });
    drag(-300);
    fireEvent.pointerUp(grip(), { ...pointer, clientX: -310 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("reads direction from the DirectionProvider", () => {
    const onConfirm = vi.fn();
    render(
      <DirectionProvider dir="rtl">
        <SlideToConfirm onConfirm={onConfirm} />
      </DirectionProvider>,
    );
    drag(-300);
    fireEvent.pointerUp(grip(), { ...pointer, clientX: -310 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("stays confirmed with resetAfter={null}", () => {
    render(<SlideToConfirm resetAfter={null} confirmedLabel="Sent" />);
    fireEvent.keyDown(grip(), { key: "Enter" });
    advance(1000);
    advance(10000);
    expect(root()).toHaveAttribute("data-state", "confirmed");
    expect(screen.getByRole("status")).toHaveTextContent("Sent");
    // A confirmed slide takes no new press.
    fireEvent.pointerDown(grip(), { ...pointer, clientX: 0 });
    fireEvent.keyUp(grip(), { key: "Enter" });
    fireEvent.keyDown(grip(), { key: "Enter" });
    expect(root()).toHaveAttribute("data-state", "confirmed");
  });

  it("offers SmoothUI's power-off slide", async () => {
    vi.useRealTimers();
    const onConfirm = vi.fn();
    render(<SlideToConfirm variant="power" onConfirm={onConfirm} resetAfter={200} />);
    expect(root()).toHaveClass("bg-secondary");
    expect(document.querySelector('[data-slot="slide-to-confirm-shimmer"]')).toHaveTextContent(
      "Slide to power off",
    );
    expect(document.querySelector('[data-slot="slide-to-confirm-power"]')).toBeInTheDocument();
    drag(300);
    fireEvent.pointerUp(grip("Slide to power off"), { ...pointer, clientX: 310 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Shutting down…");
    // The knob parks at the end.
    await wait();
    expect(at()).toBe("224px");
    expect(root()).toHaveAttribute("data-state", "confirmed");
    await wait(200);
    expect(root()).toHaveAttribute("data-state", "idle");
  });

  it("does nothing while disabled", () => {
    const onConfirm = vi.fn();
    render(<SlideToConfirm disabled onConfirm={onConfirm} />);
    expect(grip()).toBeDisabled();
    expect(root()).toHaveAttribute("data-disabled");
    fireEvent.keyDown(grip(), { key: "Enter" });
    fireEvent.pointerDown(grip(), { ...pointer, clientX: 0 });
    advance(3000);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("settles instantly under reduced motion, and the hold still works", () => {
    mockReducedMotion();
    const onConfirm = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} />);
    drag(100);
    fireEvent.pointerUp(grip(), { ...pointer, clientX: 110 });
    expect(at()).toBe("0px");
    fireEvent.keyDown(grip(), { key: "Enter" });
    advance(1000);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("applies fill, stroke, corner and a consumer className, and forwards refs", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SlideToConfirm ref={ref} fill="dark" stroke corner={12} className="w-96" />);
    expect(ref.current).toBe(root());
    expect(root()).toHaveClass("dark", "ring-1", "w-96");
    expect(root()).not.toHaveClass("w-70");
    expect(root().style.borderRadius).toBe("12px");
    expect(grip().style.borderRadius).toBe("8px");
  });

  it("maps speed to spring stiffness", () => {
    expect(slideSpring(0).stiffness).toBe(200);
    expect(slideSpring(50).stiffness).toBe(600);
    expect(slideSpring(150).stiffness).toBe(1000);
  });

  it("has no accessibility violations", async () => {
    vi.useRealTimers();
    const { container } = render(<SlideToConfirm />);
    await expectNoA11yViolations(container);
  });
});
