import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { GravityField, tiltToGravity, type GravityFieldHandle } from "./gravity-field";

/*
 * jsdom does not lay out, so every element reports a 300 × 200 box at the
 * origin, and fake timers drive requestAnimationFrame.
 */
const WIDTH = 300;
const HEIGHT = 200;

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

function glyphs(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-slot="gravity-field-glyph"]'),
  );
}

/** The glyph's centre, read back from its transform. */
function centre(glyph: HTMLElement) {
  const match = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(glyph.style.transform);
  const half = Number.parseFloat(glyph.style.width) / 2;
  return { x: Number(match?.[1]) + half, y: Number(match?.[2]) + half };
}

function press(field: HTMLElement, x: number, y: number) {
  fireEvent.pointerDown(field, { clientX: x, clientY: y, button: 0, pointerId: 1 });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: WIDTH, height: HEIGHT }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("GravityField", () => {
  it("renders an empty, focusable field that is a named button", () => {
    const { container } = render(<GravityField />);
    const field = screen.getByRole("button", { name: "Drop a glyph" });
    expect(field).toHaveAttribute("tabindex", "0");
    expect(field).toHaveAttribute("data-slot", "gravity-field");
    expect(container.querySelector('[data-slot="gravity-field-glyphs"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(glyphs(container)).toHaveLength(0);
  });

  it("drops a letter at the pointer, which falls and comes to rest on the floor", () => {
    const { container } = render(<GravityField />);
    const field = screen.getByRole("button");
    press(field, 120, 40);
    fireEvent.pointerUp(field, { pointerId: 1 });
    const [glyph] = glyphs(container);
    expect(glyph?.textContent).toMatch(/^[A-Z]$/);
    expect(centre(glyph!).y).toBeCloseTo(40, 0);
    expect(Math.abs(centre(glyph!).x - 120)).toBeLessThan(1);

    advance(100);
    const falling = centre(glyph!).y;
    expect(falling).toBeGreaterThan(40);
    advance(3000);
    const rest = centre(glyph!);
    const radius = Number.parseFloat(glyph!.style.width) * 0.42;
    expect(rest.y).toBeCloseTo(HEIGHT - radius, 0);
    expect(glyph!.style.transform).toContain("rotate(");
  });

  it("stops its loop once everything is asleep", () => {
    const frames = vi.spyOn(window, "requestAnimationFrame");
    render(<GravityField />);
    const field = screen.getByRole("button");
    press(field, 150, 100);
    fireEvent.pointerUp(field, { pointerId: 1 });
    advance(4000);
    const settled = frames.mock.calls.length;
    advance(2000);
    expect(frames.mock.calls.length).toBe(settled);
  });

  it("pours a stream while held, and stops on release", () => {
    const { container } = render(<GravityField />);
    const field = screen.getByRole("button");
    press(field, 150, 30);
    advance(100);
    expect(glyphs(container)).toHaveLength(1);
    fireEvent.pointerMove(field, { clientX: 60, clientY: 30, pointerId: 1 });
    advance(900);
    const poured = glyphs(container).length;
    expect(poured).toBeGreaterThan(8);
    expect(centre(glyphs(container).at(-1)!).x).toBeLessThan(100);

    fireEvent.pointerUp(field, { pointerId: 1 });
    advance(1000);
    expect(glyphs(container)).toHaveLength(poured);
  });

  it("ignores moves from another pointer and stops on cancel or lost capture", () => {
    const { container } = render(<GravityField />);
    const field = screen.getByRole("button");
    press(field, 150, 30);
    fireEvent.pointerMove(field, { clientX: 10, clientY: 10, pointerId: 2 });
    fireEvent.pointerCancel(field, { pointerId: 1 });
    advance(1000);
    expect(glyphs(container)).toHaveLength(1);

    press(field, 150, 30);
    fireEvent.lostPointerCapture(field, { pointerId: 1 });
    advance(1000);
    expect(glyphs(container)).toHaveLength(2);
  });

  it("ignores secondary buttons and prevented presses", () => {
    const { container } = render(
      <GravityField
        onPointerDown={(event) => {
          if (event.clientX > 200) event.preventDefault();
        }}
      />,
    );
    const field = screen.getByRole("button");
    fireEvent.pointerDown(field, { clientX: 20, clientY: 20, button: 2, pointerId: 1 });
    press(field, 250, 20);
    expect(glyphs(container)).toHaveLength(0);
  });

  it.each([
    ["numbers", /^\d$/],
    ["both", /^[A-Z\d]$/],
  ] as const)("draws from the %s pool", (pool, pattern) => {
    const { container } = render(<GravityField pool={pool} />);
    for (let i = 0; i < 6; i += 1) press(screen.getByRole("button"), 20 + i * 40, 20);
    for (const glyph of glyphs(container)) expect(glyph.textContent).toMatch(pattern);
  });

  it("drops the items it is given instead", () => {
    const { container } = render(<GravityField items={["🍎", <b key="b">bee</b>]} />);
    for (let i = 0; i < 6; i += 1) press(screen.getByRole("button"), 20 + i * 40, 20);
    for (const glyph of glyphs(container)) expect(["🍎", "bee"]).toContain(glyph.textContent);
  });

  it("sizes glyphs around the base size", () => {
    const { container } = render(<GravityField size={50} />);
    press(screen.getByRole("button"), 100, 50);
    const width = Number.parseFloat(glyphs(container)[0]!.style.width);
    expect(width).toBeGreaterThanOrEqual(42.5);
    expect(width).toBeLessThanOrEqual(57.5);
  });

  it("drops at the centre on Enter and Space, and ignores other keys", () => {
    const { container } = render(<GravityField />);
    const field = screen.getByRole("button");
    field.focus();
    fireEvent.keyDown(field, { key: "Enter" });
    fireEvent.keyDown(field, { key: " " });
    fireEvent.keyDown(field, { key: "a" });
    expect(glyphs(container)).toHaveLength(2);
    const first = centre(glyphs(container)[0]!);
    expect(Math.abs(first.x - WIDTH / 2)).toBeLessThanOrEqual(8);
    expect(first.y).toBeCloseTo(HEIGHT / 2, 0);
  });

  it("respects a prevented keydown", () => {
    const { container } = render(
      <GravityField
        onKeyDown={(event) => {
          event.preventDefault();
        }}
      />,
    );
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(glyphs(container)).toHaveLength(0);
  });

  it("fades out the oldest glyphs past maxGlyphs", () => {
    const { container } = render(<GravityField maxGlyphs={2} />);
    const field = screen.getByRole("button");
    for (const x of [50, 150, 250]) {
      press(field, x, 20);
      fireEvent.pointerUp(field, { pointerId: 1 });
    }
    expect(glyphs(container)).toHaveLength(3);
    advance(200);
    expect(Number(glyphs(container)[0]!.style.opacity)).toBeLessThan(1);
    advance(400);
    expect(glyphs(container)).toHaveLength(2);
  });

  describe("under reduced motion", () => {
    beforeEach(() => {
      media(["(prefers-reduced-motion: reduce)"]);
    });

    it("places each glyph at rest instead of letting it fall", () => {
      const { container } = render(<GravityField />);
      press(screen.getByRole("button"), 150, 20);
      const glyph = glyphs(container)[0]!;
      const radius = Number.parseFloat(glyph.style.width) * 0.42;
      expect(centre(glyph).y).toBeCloseTo(HEIGHT - radius, 0);
    });

    it("removes glyphs past the cap at once", () => {
      const { container } = render(<GravityField maxGlyphs={1} />);
      const field = screen.getByRole("button");
      press(field, 100, 20);
      press(field, 200, 20);
      expect(glyphs(container)).toHaveLength(1);
    });
  });

  it("pauses while off-screen", () => {
    let report: IntersectionObserverCallback = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          report = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const { container } = render(<GravityField />);
    press(screen.getByRole("button"), 150, 20);
    act(() => {
      report(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    advance(500);
    const glyph = glyphs(container)[0]!;
    expect(centre(glyph).y).toBeCloseTo(20, 0);
    act(() => {
      report(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    advance(300);
    expect(centre(glyph).y).toBeGreaterThan(40);
  });

  it("drops and clears through its handle", () => {
    const handle = createRef<GravityFieldHandle>();
    const { container } = render(<GravityField handleRef={handle} />);
    act(() => {
      handle.current?.drop();
      handle.current?.drop({ x: 40, y: 30 });
    });
    expect(glyphs(container)).toHaveLength(2);
    expect(centre(glyphs(container)[1]!).x).toBeCloseTo(40, 0);
    act(() => {
      handle.current?.clear();
    });
    expect(glyphs(container)).toHaveLength(0);
  });

  describe("device tilt", () => {
    function orientation(beta: number, gamma: number) {
      const event = new Event("deviceorientation");
      Object.assign(event, { beta, gamma });
      act(() => {
        window.dispatchEvent(event);
      });
    }

    it("asks for sensor permission on the first tap where required, then follows the tilt", async () => {
      const requestPermission = vi.fn().mockResolvedValue("granted");
      vi.stubGlobal("DeviceOrientationEvent", Object.assign(class {}, { requestPermission }));
      const { container } = render(<GravityField deviceTilt />);
      const field = screen.getByRole("button");
      press(field, 150, 20);
      fireEvent.pointerUp(field, { pointerId: 1 });
      fireEvent.pointerUp(field, { pointerId: 1 });
      expect(requestPermission).toHaveBeenCalledTimes(1);
      await act(async () => {
        await Promise.resolve();
      });
      advance(3000);
      const glyph = glyphs(container)[0]!;
      const before = centre(glyph).x;
      // Held upright and rolled to the right: gravity swings toward the right edge.
      for (let i = 0; i < 12; i += 1) orientation(20, 70);
      advance(3000);
      expect(centre(glyph).x).toBeGreaterThan(before + 50);
    });

    it("asks from the keyboard too, and does nothing when refused", async () => {
      const requestPermission = vi.fn().mockResolvedValue("denied");
      vi.stubGlobal("DeviceOrientationEvent", Object.assign(class {}, { requestPermission }));
      const listen = vi.spyOn(window, "addEventListener");
      render(<GravityField deviceTilt />);
      fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
      await act(async () => {
        await Promise.resolve();
      });
      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(listen).not.toHaveBeenCalledWith("deviceorientation", expect.any(Function));
    });

    it("listens at once where no permission is needed, ignoring empty readings", () => {
      vi.stubGlobal("DeviceOrientationEvent", class {});
      const listen = vi.spyOn(window, "addEventListener");
      const remove = vi.spyOn(window, "removeEventListener");
      const { unmount } = render(<GravityField deviceTilt />);
      expect(listen).toHaveBeenCalledWith("deviceorientation", expect.any(Function));
      const event = new Event("deviceorientation");
      Object.assign(event, { beta: null, gamma: null });
      window.dispatchEvent(event);
      orientation(0, 0);
      unmount();
      expect(remove).toHaveBeenCalledWith("deviceorientation", expect.any(Function));
    });

    it("is ignored under reduced motion", () => {
      media(["(prefers-reduced-motion: reduce)"]);
      vi.stubGlobal("DeviceOrientationEvent", class {});
      const listen = vi.spyOn(window, "addEventListener");
      render(<GravityField deviceTilt />);
      expect(listen).not.toHaveBeenCalledWith("deviceorientation", expect.any(Function));
    });
  });

  it("maps device orientation to a direction on the screen", () => {
    const upright = tiltToGravity(90, 0)!;
    expect(upright.x).toBeCloseTo(0);
    expect(upright.y).toBeCloseTo(1);
    const rolledRight = tiltToGravity(0, 30)!;
    expect(rolledRight.x).toBeCloseTo(1);
    expect(tiltToGravity(0, 2)).toBeNull();
    const landscape = tiltToGravity(90, 0, 90)!;
    expect(landscape.x).toBeCloseTo(1);
    expect(tiltToGravity(90, 0, 180)!.y).toBeCloseTo(-1);
    expect(tiltToGravity(90, 0, -90)!.x).toBeCloseTo(-1);
  });

  it("lets a consumer className win, forwards ref, props and handlers", () => {
    const ref = createRef<HTMLDivElement>();
    const handlers = {
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
      onPointerCancel: vi.fn(),
      onLostPointerCapture: vi.fn(),
      onKeyDown: vi.fn(),
    };
    render(
      <GravityField
        ref={ref}
        className="h-96 rounded-none"
        surface="outline"
        label="Letter pit"
        data-testid="field"
        {...handlers}
      >
        <p>Click anywhere</p>
      </GravityField>,
    );
    const field = screen.getByTestId("field");
    expect(ref.current).toBe(field);
    expect(field).toHaveClass("h-96", "rounded-none", "border");
    expect(field).not.toHaveClass("h-72", "rounded-xl");
    expect(field).toHaveAccessibleName("Letter pit");
    expect(screen.getByText("Click anywhere")).toBeInTheDocument();
    press(field, 10, 10);
    fireEvent.pointerMove(field, { pointerId: 1 });
    fireEvent.pointerUp(field, { pointerId: 1 });
    fireEvent.pointerCancel(field, { pointerId: 1 });
    fireEvent.lostPointerCapture(field, { pointerId: 1 });
    fireEvent.keyDown(field, { key: "x" });
    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalled();
  });

  it("calls a callback ref", () => {
    const ref = vi.fn();
    render(<GravityField ref={ref} />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });

  it("has no accessibility violations, empty or full", async () => {
    vi.useRealTimers();
    const { container } = render(<GravityField items={["⭐", "🌙"]} />);
    await expectNoA11yViolations(container);
    press(screen.getByRole("button"), 100, 40);
    await expectNoA11yViolations(container);
  });
});
