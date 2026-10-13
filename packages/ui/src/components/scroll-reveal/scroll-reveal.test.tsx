import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ScrollReveal } from "./scroll-reveal";

/** A controllable IntersectionObserver: `fire(visible)` reports every observed node. */
function stubObserver() {
  const callbacks: IntersectionObserverCallback[] = [];
  const disconnect = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect = disconnect;
      takeRecords() {
        return [];
      }
    },
  );
  return {
    disconnect,
    fire(visible: boolean) {
      act(() => {
        for (const callback of callbacks) {
          callback(
            [{ isIntersecting: visible } as IntersectionObserverEntry],
            {} as IntersectionObserver,
          );
        }
      });
    },
  };
}

/** Puts every element's box at `top`, so it is on or off screen. */
function placeAt(top: number) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, top, 300, 100),
  );
}

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

const box = () => screen.getByTestId("reveal");

describe("ScrollReveal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("hides content below the fold until it scrolls in, then reveals it once", async () => {
    const io = stubObserver();
    placeAt(5000);
    const onReveal = vi.fn();
    const { container } = render(
      <ScrollReveal data-testid="reveal" onReveal={onReveal}>
        <p>Below the fold</p>
      </ScrollReveal>,
    );
    expect(box()).toHaveAttribute("data-state", "hidden");
    // Hidden from sight, not from assistive technology.
    expect(screen.getByText("Below the fold")).toBeInTheDocument();
    io.fire(true);
    expect(box()).toHaveAttribute("data-state", "shown");
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(io.disconnect).toHaveBeenCalled();
    await expectNoA11yViolations(container);
  });

  it("leaves content that is already on screen exactly as it is", () => {
    stubObserver();
    placeAt(100);
    render(<ScrollReveal data-testid="reveal">On screen</ScrollReveal>);
    expect(box()).toHaveAttribute("data-state", "idle");
  });

  it("hides nothing without an IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    placeAt(5000);
    render(<ScrollReveal data-testid="reveal">No observer</ScrollReveal>);
    expect(box()).toHaveAttribute("data-state", "idle");
  });

  it("hides nothing under reduced motion", () => {
    mockReducedMotion(true);
    stubObserver();
    placeAt(5000);
    render(<ScrollReveal data-testid="reveal">Reduced</ScrollReveal>);
    expect(box()).toHaveAttribute("data-state", "idle");
  });

  it("hides again when scrolled away if it is not once", () => {
    const io = stubObserver();
    placeAt(5000);
    render(
      <ScrollReveal data-testid="reveal" once={false}>
        Repeats
      </ScrollReveal>,
    );
    io.fire(true);
    expect(box()).toHaveAttribute("data-state", "shown");
    io.fire(false);
    expect(box()).toHaveAttribute("data-state", "hidden");
    io.fire(true);
    expect(box()).toHaveAttribute("data-state", "shown");
  });

  it("puts each effect's hidden state on the box, and on the children when staggered", () => {
    stubObserver();
    placeAt(5000);
    const { rerender } = render(
      <ScrollReveal data-testid="reveal" effect="blur">
        x
      </ScrollReveal>,
    );
    expect(box().className).toContain("data-[state=hidden]:blur-sm");
    rerender(
      <ScrollReveal data-testid="reveal" effect="start" stagger={80}>
        <span>a</span>
        <span>b</span>
      </ScrollReveal>,
    );
    expect(box().className).toContain(
      "data-[state=hidden]:*:-translate-x-(--scroll-reveal-distance)",
    );
    expect(box().className).not.toContain("data-[state=hidden]:opacity-0 ");
    expect(box()).toHaveAttribute("data-stagger", "true");
  });

  it("delays each direct child a step more than the last", () => {
    render(
      <ScrollReveal data-testid="reveal" stagger={80} delay={100}>
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </ScrollReveal>,
    );
    const delays = [...box().children].map((child) =>
      (child as HTMLElement).style.getPropertyValue("--scroll-reveal-delay"),
    );
    expect(delays).toEqual([
      "calc(100ms * var(--motion-scale, 1))",
      "calc(180ms * var(--motion-scale, 1))",
      "calc(260ms * var(--motion-scale, 1))",
    ]);
  });

  it("sets distance, duration and delay, scaled by --motion-scale", () => {
    render(<ScrollReveal data-testid="reveal" distance={40} duration={900} delay={-5} />);
    expect(box().style.getPropertyValue("--scroll-reveal-distance")).toBe("40px");
    expect(box().style.getPropertyValue("--scroll-reveal-duration")).toBe(
      "calc(900ms * var(--motion-scale, 1))",
    );
    expect(box().style.getPropertyValue("--scroll-reveal-delay")).toBe(
      "calc(0ms * var(--motion-scale, 1))",
    );
  });

  it("lets className win, forwards its ref and spreads props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ScrollReveal ref={ref} data-testid="reveal" className="ease-linear" id="r" />);
    expect(ref.current).toBe(box());
    expect(box()).toHaveClass("ease-linear");
    expect(box()).not.toHaveClass("ease-(--ease-out-quint)");
    expect(box()).toHaveAttribute("id", "r");
  });
});
