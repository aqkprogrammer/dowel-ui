import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { StatsTrendCardsBlock } from "./stats-trend-cards";

function stubObserver() {
  let fire: ((isIntersecting: boolean) => void) | undefined;
  const disconnect = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        fire = (isIntersecting) => {
          callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
        };
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  return { fire: (value = true) => fire?.(value), disconnect };
}

function belowFold() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 5000,
  } as DOMRect);
}

function root(container: HTMLElement) {
  return container.querySelector("[data-slot=stats-trend-cards]") as HTMLElement;
}

function flows(container: HTMLElement) {
  return [...container.querySelectorAll("[data-slot=number-flow] > .sr-only")].map(
    (node) => node.textContent,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("StatsTrendCardsBlock", () => {
  it("is a section named by its heading", () => {
    render(<StatsTrendCardsBlock />);
    expect(screen.getByRole("region", { name: "Key metrics" })).toBeVisible();
  });

  it("is a description list with each figure read once", () => {
    const { container } = render(<StatsTrendCardsBlock locales="en-US" />);
    expect(screen.getAllByRole("term")).toHaveLength(4);
    for (const text of ["$2.5M", "45K", "98%", "1.2M"]) {
      expect(screen.getByText(text, { selector: "dd > .sr-only" })).toBeInTheDocument();
    }
    expect(
      container.querySelector("[data-slot=number-flow]")?.closest("[aria-hidden=true]"),
    ).not.toBeNull();
  });

  it("states the trend in words, not only an arrow and a colour", () => {
    render(<StatsTrendCardsBlock locales="en-US" />);
    expect(screen.getByText("up 12%")).toHaveClass("sr-only");
  });

  it("colours a trend by polarity, not by direction", () => {
    const { container } = render(
      <StatsTrendCardsBlock
        locales="en-US"
        stats={[
          { label: "Churn", value: 4, trend: { change: 0.1, polarity: "lower-is-better" } },
          { label: "Cost", value: 9, trend: { change: -0.05, polarity: "lower-is-better" } },
          { label: "Sessions", value: 7, trend: { change: -0.2 } },
          { label: "Flat", value: 1, trend: { change: 0 } },
          { label: "Visits", value: 3, trend: { change: 0.3, polarity: "neutral" } },
        ]}
      />,
    );
    const trends = [...container.querySelectorAll("[data-slot=stats-trend-cards-trend]")];
    expect(trends.map((trend) => trend.getAttribute("data-direction"))).toEqual([
      "up",
      "down",
      "down",
      "unchanged",
      "up",
    ]);
    expect(trends[0]).toHaveClass("bg-destructive");
    expect(trends[1]).toHaveClass("bg-success");
    expect(trends[2]).toHaveClass("bg-destructive");
    expect(trends[3]).toHaveClass("bg-secondary");
    expect(trends[4]).toHaveClass("bg-secondary");
    expect(screen.getByText("down 5%")).toBeInTheDocument();
    expect(screen.getByText("unchanged")).toBeInTheDocument();
  });

  it("hides icons and omits what is not given", () => {
    const { container } = render(
      <StatsTrendCardsBlock stats={[{ label: "Bare", value: 5 }]} description={null} />,
    );
    expect(screen.getAllByRole("definition")).toHaveLength(1);
    expect(container.querySelector("[data-slot=stats-trend-cards-icon]")).toBeNull();
    const withIcon = render(<StatsTrendCardsBlock />);
    const icon = withIcon.container.querySelector("[data-slot=stats-trend-cards-icon]");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("rolls figures up from zero when a row below the fold scrolls in", () => {
    const observer = stubObserver();
    belowFold();
    const { container } = render(<StatsTrendCardsBlock locales="en-US" />);
    expect(root(container)).toHaveAttribute("data-reveal", "pending");
    expect(flows(container)).toEqual(["0", "0", "0", "0"]);
    act(() => {
      observer.fire();
    });
    expect(root(container)).toHaveAttribute("data-reveal", "shown");
    expect(flows(container)).toEqual(["2.5M", "45K", "98", "1.2M"]);
  });

  it("shows values at once on screen, under reduced motion and without an observer", () => {
    stubObserver();
    const onScreen = render(<StatsTrendCardsBlock />);
    expect(root(onScreen.container)).not.toHaveAttribute("data-reveal");
    onScreen.unmount();

    belowFold();
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const reduced = render(<StatsTrendCardsBlock />);
    expect(root(reduced.container)).not.toHaveAttribute("data-reveal");
    reduced.unmount();

    vi.stubGlobal("IntersectionObserver", undefined);
    const unsupported = render(<StatsTrendCardsBlock />);
    expect(root(unsupported.container)).not.toHaveAttribute("data-reveal");
  });

  it("re-levels its heading, lets a consumer className win and forwards refs", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(
      <StatsTrendCardsBlock ref={ref} headingLevel={3} className="max-w-none" />,
    );
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    expect(ref.current).toBe(root(container));
    expect(root(container)).toHaveClass("max-w-none");
    expect(root(container)).not.toHaveClass("max-w-7xl");
  });

  it("has no axe violations", async () => {
    const { container } = render(<StatsTrendCardsBlock />);
    await expectNoA11yViolations(container);
  });
});
