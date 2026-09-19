import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FeaturesIconGridBlock } from "./features-icon-grid";

/** Stubs IntersectionObserver and returns a trigger for the first observer. */
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

/** Puts every element below the fold. */
function belowFold() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 5000,
  } as DOMRect);
}

function root(container: HTMLElement) {
  return container.querySelector("[data-slot=features-icon-grid]") as HTMLElement;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FeaturesIconGridBlock", () => {
  it("is a section named by its heading", () => {
    render(<FeaturesIconGridBlock />);
    expect(screen.getByRole("region", { name: "Everything you need to build" })).toBeVisible();
  });

  it("renders the default features as a list with sub-headings", () => {
    render(<FeaturesIconGridBlock />);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByRole("heading", { level: 3, name: "Accessible" })).toBeInTheDocument();
  });

  it("takes its content from props", () => {
    render(
      <FeaturesIconGridBlock
        heading="Why us"
        description={null}
        features={[{ title: "Fast", description: "Very." }]}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Why us" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Very.")).toBeInTheDocument();
  });

  it("re-levels its headings", () => {
    render(<FeaturesIconGridBlock headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3, name: /Everything/ })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(6);
  });

  it("never goes below h6", () => {
    render(<FeaturesIconGridBlock headingLevel={6} />);
    expect(screen.getAllByRole("heading", { level: 6 })).toHaveLength(7);
  });

  it("hides icons from assistive technology", () => {
    const { container } = render(<FeaturesIconGridBlock />);
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg.closest("[aria-hidden=true]")).not.toBeNull();
    }
  });

  it("lets a consumer className win", () => {
    const { container } = render(<FeaturesIconGridBlock className="max-w-none" />);
    expect(root(container)).toHaveClass("max-w-none");
    expect(root(container)).not.toHaveClass("max-w-6xl");
  });

  it("forwards refs and native props", () => {
    const ref = createRef<HTMLElement>();
    const callback = vi.fn();
    render(<FeaturesIconGridBlock ref={ref} data-testid="block" />);
    expect(ref.current).toBe(screen.getByTestId("block"));
    render(<FeaturesIconGridBlock ref={callback} />);
    expect(callback).toHaveBeenCalledWith(expect.any(HTMLElement));
  });

  it("does not hide a grid that is already on screen", () => {
    stubObserver();
    const { container } = render(<FeaturesIconGridBlock />);
    expect(root(container)).not.toHaveAttribute("data-reveal");
  });

  it("reveals a grid below the fold once it scrolls into view", () => {
    const observer = stubObserver();
    belowFold();
    const { container, unmount } = render(<FeaturesIconGridBlock />);
    expect(root(container)).toHaveAttribute("data-reveal", "pending");
    act(() => {
      observer.fire(false);
    });
    expect(root(container)).toHaveAttribute("data-reveal", "pending");
    act(() => {
      observer.fire();
    });
    expect(root(container)).toHaveAttribute("data-reveal", "shown");
    expect(observer.disconnect).toHaveBeenCalled();
    unmount();
  });

  it("hides nothing under reduced motion", () => {
    stubObserver();
    belowFold();
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const { container } = render(<FeaturesIconGridBlock />);
    expect(root(container)).not.toHaveAttribute("data-reveal");
  });

  it("hides nothing without IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    belowFold();
    const { container } = render(<FeaturesIconGridBlock />);
    expect(root(container)).not.toHaveAttribute("data-reveal");
  });

  it("has no axe violations", async () => {
    const { container } = render(<FeaturesIconGridBlock />);
    await expectNoA11yViolations(container);
  });
});
