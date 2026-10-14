import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  HorizontalScroll,
  HorizontalScrollItem,
  horizontalProgress,
} from "./horizontal-scroll";

function mockReducedMotion(reduced: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduced && query.includes("reduced-motion"),
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

function Row(props: Partial<Parameters<typeof HorizontalScroll>[0]>) {
  return (
    <HorizontalScroll label="Case studies" {...props}>
      {["Atlas", "Borealis", "Cirrus", "Delta"].map((name) => (
        <HorizontalScrollItem key={name} className="w-80">
          <a href={`#${name}`}>{name}</a>
        </HorizontalScrollItem>
      ))}
    </HorizontalScroll>
  );
}

const region = () => screen.getByRole("region", { name: "Case studies" });
const part = (slot: string) => region().querySelector<HTMLElement>(`[data-slot=${slot}]`);

/** Makes the row `extra` pixels wider than a 1000px screen, and the section's top at `top`. */
function measure(extra: number, top: number) {
  const viewport = part("horizontal-scroll-viewport");
  const track = part("horizontal-scroll-track");
  if (!viewport || !track) throw new Error("missing parts");
  Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 1000 });
  Object.defineProperty(track, "scrollWidth", { configurable: true, value: 1000 + extra });
  region().getBoundingClientRect = () => new DOMRect(0, top, 1000, 800 + extra);
}

/** A ResizeObserver whose callback the test fires. */
function stubResizeObserver() {
  let callback: () => void = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(fire: () => void) {
        callback = fire;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  return () => {
    callback();
  };
}

describe("HorizontalScroll", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("is a labelled region whose items stay in order and reachable", async () => {
    const { container } = render(<Row />);
    expect(region()).toHaveAttribute("data-pinned", "true");
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Atlas",
      "Borealis",
      "Cirrus",
      "Delta",
    ]);
    await expectNoA11yViolations(container);
  });

  it("is a plain focusable scroller under reduced motion or with pin off", () => {
    mockReducedMotion(true);
    const { rerender } = render(<Row />);
    expect(region()).not.toHaveAttribute("data-pinned");
    expect(part("horizontal-scroll-viewport")).toHaveAttribute("tabindex", "0");
    expect(part("horizontal-scroll-viewport")).toHaveClass("overflow-x-auto");
    vi.restoreAllMocks();
    rerender(<Row pin={false} />);
    expect(region()).not.toHaveAttribute("data-pinned");
    expect(region().style.height).toBe("");
  });

  it("grows by the row's extra width and slides the row as the page scrolls", async () => {
    const resize = stubResizeObserver();
    render(<Row />);
    measure(1500, 0);
    act(() => {
      resize();
    });
    expect(part("horizontal-scroll-viewport")).toHaveClass("sticky");
    // jsdom reorders the terms of a calc(); either order is the same height.
    expect(region().style.height).toMatch(/100svh/);
    expect(region().style.height).toMatch(/1500px/);
    // Scrolled 600px into a 1500px travel: the row has moved 600px across.
    measure(1500, -600);
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(part("horizontal-scroll-track")?.style.transform).toBe(
      "translate3d(-600.0px, 0, 0)",
    );
  });

  it("scrolls the page to an item when it takes focus", () => {
    const resize = stubResizeObserver();
    render(<Row />);
    measure(1500, 0);
    act(() => {
      resize();
    });
    const viewport = part("horizontal-scroll-viewport");
    const items = region().querySelectorAll<HTMLElement>("[data-slot=horizontal-scroll-item]");
    items.forEach((item, i) => {
      Object.defineProperty(item, "offsetLeft", { configurable: true, value: i * 500 });
      Object.defineProperty(item, "offsetWidth", { configurable: true, value: 400 });
    });
    if (viewport) viewport.scrollLeft = 120;
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    fireEvent.focus(screen.getByRole("link", { name: "Cirrus" }));
    // Cirrus starts 1000px in; centred in a 1000px screen that is 700px of travel.
    expect(scrollTo).toHaveBeenCalledWith({ top: window.scrollY + 700, behavior: "auto" });
    expect(viewport?.scrollLeft).toBe(0);
  });

  it("lets className win, forwards its ref and styles the track", () => {
    const ref = createRef<HTMLElement>();
    render(<Row ref={ref} className="static" trackClassName="items-start" gap={40} />);
    expect(ref.current).toBe(region());
    expect(region()).toHaveClass("static");
    expect(region()).not.toHaveClass("relative");
    expect(part("horizontal-scroll-track")).toHaveClass("items-start");
    expect(region().style.getPropertyValue("--horizontal-scroll-gap")).toBe("40px");
  });
});

describe("horizontalProgress", () => {
  it("maps the section's scroll to 0–1 of the row's travel", () => {
    expect(horizontalProgress(0, 1500)).toBe(0);
    expect(horizontalProgress(750, 1500)).toBe(0.5);
    expect(horizontalProgress(3000, 1500)).toBe(1);
    expect(horizontalProgress(-200, 1500)).toBe(0);
    expect(horizontalProgress(100, 0)).toBe(0);
  });
});
