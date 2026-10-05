import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { HEXAGON_BACKGROUND_MAX_TILES, HexagonBackground } from "./hexagon-background";

/*
 * jsdom does not lay out, so the root's box is stubbed. At md (56px tiles, a
 * 4px gap) a 300×200 box is 7 columns × 6 rows: one tile of overfill on each
 * side. Tile 8 is centred on the box's top-left corner, tile 9 one pitch
 * (60px) to its right, and tile 15 half a pitch in on the next row down.
 */
let box = { width: 300, height: 200 };

function measure() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.dataset.slot === "hexagon-background"
      ? new DOMRect(0, 0, box.width, box.height)
      : new DOMRect();
  });
}

function root(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="hexagon-background"]');
}

function tiles(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="hexagon-background-tile"]')];
}

function lit(container: HTMLElement) {
  return tiles(container)
    .map((tile, index) => (tile.hasAttribute("data-lit") ? index : -1))
    .filter((index) => index >= 0);
}

function move(target: HTMLElement, clientX: number, clientY: number, pointerType = "mouse") {
  fireEvent.pointerMove(target, { clientX, clientY, pointerType });
}

function prefersReducedMotion(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches,
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
  box = { width: 300, height: 200 };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("HexagonBackground", () => {
  it("renders no tiles until the box has a size", () => {
    const { container } = render(<HexagonBackground />);
    expect(tiles(container)).toHaveLength(0);
    expect(container.querySelector('[data-slot="hexagon-background-layer"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("fills a measured box with an overfilled honeycomb under its content", () => {
    measure();
    const { container } = render(
      <HexagonBackground>
        <h2>Build in public</h2>
      </HexagonBackground>,
    );
    expect(tiles(container)).toHaveLength(42);
    const first = tiles(container)[8];
    expect(first?.style.width).toBe("56px");
    expect(first?.style.translate).toBe("-28.00px -32.33px");
    // Odd rows carry the half-pitch shift.
    expect(tiles(container)[15]?.style.translate).toBe("2.00px 19.63px");
    const content = container.querySelector('[data-slot="hexagon-background-content"]');
    expect(content).toHaveClass("relative", "z-10");
    expect(content).toContainElement(screen.getByRole("heading", { name: "Build in public" }));
    expect(root(container)).toHaveClass("relative", "isolate", "overflow-hidden");
  });

  it("renders no content layer without children", () => {
    measure();
    const { container } = render(<HexagonBackground />);
    expect(container.querySelector('[data-slot="hexagon-background-content"]')).toBeNull();
  });

  it.each([
    ["sm", "36px", "[--hexagon-edge:1px]"],
    ["md", "56px", "[--hexagon-edge:1.5px]"],
    ["lg", "84px", "[--hexagon-edge:2px]"],
  ] as const)("applies the %s size", (size, width, edge) => {
    measure();
    const { container } = render(<HexagonBackground size={size} />);
    expect(tiles(container)[0]?.style.width).toBe(width);
    expect(root(container)).toHaveClass(edge);
  });

  it("spaces tiles by the gap", () => {
    measure();
    const { container } = render(<HexagonBackground gap={24} />);
    // An 80px pitch: 6 columns × 5 rows.
    expect(tiles(container)).toHaveLength(30);
  });

  it("caps the tile count by growing the tiles", () => {
    box = { width: 4000, height: 3000 };
    measure();
    const { container } = render(<HexagonBackground size="sm" gap={2} />);
    const count = tiles(container).length;
    expect(count).toBeLessThanOrEqual(HEXAGON_BACKGROUND_MAX_TILES);
    expect(count).toBeGreaterThan(HEXAGON_BACKGROUND_MAX_TILES * 0.8);
    expect(parseFloat(tiles(container)[0]?.style.width ?? "0")).toBeGreaterThan(36);
  });

  it("re-lays the honeycomb as the box resizes", () => {
    let notify: ResizeObserverCallback = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    measure();
    const { container } = render(<HexagonBackground />);
    expect(tiles(container)).toHaveLength(42);
    const resize = (width: number, height: number) => {
      act(() => {
        notify(
          [{ contentRect: { width, height } } as ResizeObserverEntry],
          {} as ResizeObserver,
        );
      });
    };
    resize(600, 200);
    expect(tiles(container)).toHaveLength(72);
    resize(600, 200);
    expect(tiles(container)).toHaveLength(72);
    resize(0, 0);
    expect(tiles(container)).toHaveLength(0);
    act(() => {
      notify([], {} as ResizeObserver);
    });
    vi.unstubAllGlobals();
  });

  it("lights the tile under the pointer and fades it after the pointer moves on", () => {
    vi.useFakeTimers();
    measure();
    const { container } = render(<HexagonBackground data-testid="bg" />);
    const area = screen.getByTestId("bg");
    expect(area).toHaveAttribute("data-interactive");

    move(area, 0, 0);
    expect(lit(container)).toEqual([8]);
    move(area, 2, 1);
    expect(lit(container)).toEqual([8]);
    move(area, 60, 0);
    // The tile just left lingers as the trail.
    expect(lit(container)).toEqual([8, 9]);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(lit(container)).toEqual([9]);

    fireEvent.pointerLeave(area);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(lit(container)).toEqual([]);
  });

  it("lights every tile a fast stroke crosses", () => {
    vi.useFakeTimers();
    measure();
    const { container } = render(<HexagonBackground data-testid="bg" />);
    const area = screen.getByTestId("bg");
    move(area, 0, 0);
    move(area, 240, 0);
    expect(lit(container)).toEqual([8, 9, 10, 11, 12]);
    // Re-entering a fading tile holds it again.
    move(area, 180, 0);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(lit(container)).toEqual([11]);
  });

  it("maps a point to the nearest centre on the offset row", () => {
    measure();
    const { container } = render(<HexagonBackground data-testid="bg" />);
    move(screen.getByTestId("bg"), 30, 52);
    expect(lit(container)).toEqual([15]);
  });

  it("ignores touch, and the pointer entirely when not interactive", () => {
    measure();
    const { container, rerender } = render(<HexagonBackground data-testid="bg" />);
    move(screen.getByTestId("bg"), 0, 0, "touch");
    expect(lit(container)).toEqual([]);
    rerender(<HexagonBackground data-testid="bg" interactive={false} />);
    expect(screen.getByTestId("bg")).not.toHaveAttribute("data-interactive");
    move(screen.getByTestId("bg"), 0, 0);
    expect(lit(container)).toEqual([]);
  });

  it("does nothing under the pointer before it is measured", () => {
    const onPointerMove = vi.fn();
    const { container } = render(
      <HexagonBackground data-testid="bg" onPointerMove={onPointerMove} />,
    );
    move(screen.getByTestId("bg"), 0, 0);
    expect(onPointerMove).toHaveBeenCalledTimes(1);
    expect(lit(container)).toEqual([]);
  });

  it("sends idle ripples outward from a random point", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    measure();
    const { container } = render(<HexagonBackground idle idleInterval={1000} />);
    expect(root(container)).not.toHaveAttribute("data-ripple");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root(container)).toHaveAttribute("data-ripple", "a");
    // The origin is the top-left corner: the tile centred there starts at once,
    // the one a pitch away 60px / 0.7px·ms later.
    expect(tiles(container)[8]?.style.getPropertyValue("--hexagon-delay")).toBe(
      "calc(0ms * var(--motion-scale, 1))",
    );
    expect(tiles(container)[9]?.style.getPropertyValue("--hexagon-delay")).toBe(
      "calc(86ms * var(--motion-scale, 1))",
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root(container)).toHaveAttribute("data-ripple", "b");
  });

  it("holds ripples while the pointer is over it, or the tab is hidden", () => {
    vi.useFakeTimers();
    measure();
    const { container } = render(
      <HexagonBackground idle idleInterval={1000} data-testid="bg" />,
    );
    move(screen.getByTestId("bg"), 0, 0);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root(container)).not.toHaveAttribute("data-ripple");

    fireEvent.pointerLeave(screen.getByTestId("bg"));
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root(container)).not.toHaveAttribute("data-ripple");
    hidden.mockReturnValue(false);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root(container)).toHaveAttribute("data-ripple", "a");
  });

  it("pauses ripples off-screen", () => {
    vi.useFakeTimers();
    let report: IntersectionObserverCallback = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          report = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    measure();
    const { container, unmount } = render(<HexagonBackground idle idleInterval={1000} />);
    act(() => {
      report(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      vi.advanceTimersByTime(1000);
    });
    expect(root(container)).not.toHaveAttribute("data-ripple");
    unmount();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("stops ripples when idle is turned off", () => {
    vi.useFakeTimers();
    measure();
    const { container, rerender } = render(<HexagonBackground idle idleInterval={1000} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root(container)).toHaveAttribute("data-ripple", "a");
    rerender(<HexagonBackground idleInterval={1000} />);
    expect(root(container)).not.toHaveAttribute("data-ripple");
  });

  it("is a still honeycomb under reduced motion", () => {
    vi.useFakeTimers();
    prefersReducedMotion(true);
    measure();
    const { container } = render(
      <HexagonBackground idle idleInterval={1000} data-testid="bg" />,
    );
    expect(tiles(container)).toHaveLength(42);
    expect(screen.getByTestId("bg")).not.toHaveAttribute("data-interactive");
    move(screen.getByTestId("bg"), 0, 0);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(lit(container)).toEqual([]);
    expect(root(container)).not.toHaveAttribute("data-ripple");
  });

  it("drops pending fades on unmount", () => {
    vi.useFakeTimers();
    measure();
    const { unmount } = render(<HexagonBackground data-testid="bg" />);
    move(screen.getByTestId("bg"), 0, 0);
    move(screen.getByTestId("bg"), 60, 0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps content above it interactive from the keyboard", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <HexagonBackground>
        <button type="button" onClick={onClick}>
          Subscribe
        </button>
      </HexagonBackground>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Subscribe" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards the pointer leave handler", () => {
    const onPointerLeave = vi.fn();
    render(<HexagonBackground data-testid="bg" onPointerLeave={onPointerLeave} />);
    fireEvent.pointerLeave(screen.getByTestId("bg"));
    expect(onPointerLeave).toHaveBeenCalledTimes(1);
  });

  it("lets a consumer className win and forwards object and callback refs and props", () => {
    const ref = createRef<HTMLDivElement>();
    const { container, unmount } = render(
      <HexagonBackground
        ref={ref}
        className="bg-card"
        layerClassName="opacity-70"
        data-testid="bg"
        id="honeycomb"
      />,
    );
    const area = screen.getByTestId("bg");
    expect(ref.current).toBe(area);
    expect(area).toHaveAttribute("id", "honeycomb");
    expect(area).toHaveClass("bg-card");
    expect(area).not.toHaveClass("bg-background");
    expect(container.querySelector('[data-slot="hexagon-background-layer"]')).toHaveClass(
      "opacity-70",
    );
    unmount();

    const callback = vi.fn();
    render(<HexagonBackground ref={callback} />);
    expect(callback).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });

  it("has no accessibility violations", async () => {
    measure();
    const { container } = render(
      <HexagonBackground idle>
        <h2>Welcome</h2>
        <a href="/start">Start</a>
      </HexagonBackground>,
    );
    await expectNoA11yViolations(container);
  });
});
