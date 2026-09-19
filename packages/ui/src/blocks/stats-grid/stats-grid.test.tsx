import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { StatsGridBlock } from "./stats-grid";

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
  return container.querySelector("[data-slot=stats-grid]") as HTMLElement;
}

/** What the rolling digits currently show (their own settled text). */
function flows(container: HTMLElement) {
  return [...container.querySelectorAll("[data-slot=number-flow] > .sr-only")].map(
    (node) => node.textContent,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("StatsGridBlock", () => {
  it("is a section named by its heading", () => {
    render(<StatsGridBlock />);
    expect(screen.getByRole("region", { name: "Our impact in numbers" })).toBeVisible();
  });

  it("is a description list: labels as terms, figures as definitions", () => {
    render(<StatsGridBlock locales="en-US" />);
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual([
      "Active users",
      "Uptime",
      "Countries",
      "Support",
    ]);
    expect(screen.getAllByRole("definition")).toHaveLength(8);
    for (const text of ["10M+", "99.9%", "24/7"]) {
      expect(screen.getByText(text).closest("dd")).not.toBeNull();
    }
  });

  it("reads each figure once, with the rolling digits hidden", () => {
    const { container } = render(
      <StatsGridBlock
        locales="en-US"
        stats={[{ label: "Revenue", value: 1200, prefix: "$" }]}
      />,
    );
    expect(screen.getByText("$1,200")).toHaveClass("sr-only");
    const flow = container.querySelector("[data-slot=number-flow]");
    expect(flow?.closest("[aria-hidden=true]")).not.toBeNull();
  });

  it("rolls figures up from zero when a row below the fold scrolls in", () => {
    const observer = stubObserver();
    belowFold();
    const { container } = render(<StatsGridBlock locales="en-US" />);
    expect(root(container)).toHaveAttribute("data-reveal", "pending");
    expect(flows(container)).toEqual(["0", "0.0", "0"]);
    // The settled value is what assistive technology reads throughout.
    expect(screen.getByText("10M+")).toBeInTheDocument();
    act(() => {
      observer.fire();
    });
    expect(root(container)).toHaveAttribute("data-reveal", "shown");
    expect(flows(container)).toEqual(["10M", "99.9", "150"]);
  });

  it("shows values at once on screen, under reduced motion and without an observer", () => {
    stubObserver();
    const onScreen = render(<StatsGridBlock locales="en-US" />);
    expect(root(onScreen.container)).not.toHaveAttribute("data-reveal");
    expect(flows(onScreen.container)).toEqual(["10M", "99.9", "150"]);
    onScreen.unmount();

    belowFold();
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const reduced = render(<StatsGridBlock />);
    expect(root(reduced.container)).not.toHaveAttribute("data-reveal");
    reduced.unmount();

    vi.stubGlobal("IntersectionObserver", undefined);
    const unsupported = render(<StatsGridBlock />);
    expect(root(unsupported.container)).not.toHaveAttribute("data-reveal");
  });

  it("omits a missing description and re-levels its heading", () => {
    render(
      <StatsGridBlock
        headingLevel={3}
        heading="Numbers"
        description={null}
        stats={[{ label: "Teams", value: 42 }]}
      />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Numbers" })).toBeInTheDocument();
    expect(screen.getAllByRole("definition")).toHaveLength(1);
  });

  it("lets a consumer className win and forwards refs", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<StatsGridBlock ref={ref} className="max-w-none" />);
    expect(ref.current).toBe(root(container));
    expect(root(container)).toHaveClass("max-w-none");
    expect(root(container)).not.toHaveClass("max-w-7xl");
  });

  it("has no axe violations", async () => {
    const { container } = render(<StatsGridBlock />);
    await expectNoA11yViolations(container);
  });
});
