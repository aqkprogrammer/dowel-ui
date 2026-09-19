import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { BentoAnalyticsPanel, FeaturesBentoBlock } from "./features-bento";

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
  return container.querySelector("[data-slot=features-bento]") as HTMLElement;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FeaturesBentoBlock", () => {
  it("is a section named by its heading", () => {
    render(<FeaturesBentoBlock />);
    expect(screen.getByRole("region", { name: "Built for modern teams" })).toBeVisible();
  });

  it("renders the default cells as a list, the first as the lead", () => {
    const { container } = render(<FeaturesBentoBlock />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveAttribute("data-lead");
    expect(items[1]).not.toHaveAttribute("data-lead");
    expect(container.querySelectorAll("[data-slot=features-bento-bar]")).toHaveLength(12);
  });

  it("states the analytics figures in text and hides the bars", () => {
    const { container } = render(<FeaturesBentoBlock />);
    expect(screen.getByText("$48,219")).toBeInTheDocument();
    expect(screen.getByText("+12.4%")).toBeInTheDocument();
    const bars = container.querySelector("[data-slot=features-bento-bar]")?.parentElement;
    expect(bars).toHaveAttribute("aria-hidden", "true");
  });

  it("highlights the tallest bar of a custom series", () => {
    const { container } = render(<BentoAnalyticsPanel series={[10, 80, 40]} value="12" />);
    const bars = container.querySelectorAll("[data-slot=features-bento-bar]");
    expect(bars[1]).toHaveClass("bg-foreground");
    expect(bars[0]).toHaveClass("bg-foreground/15");
    expect(bars[1]).toHaveStyle({ height: "80%" });
  });

  it("takes its content from props", () => {
    render(
      <FeaturesBentoBlock
        heading="Platform"
        description={null}
        features={[
          { title: "Lead", description: "With a picture.", visual: <p>Picture</p> },
          { title: "Other", description: "Without." },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Platform" })).toBeInTheDocument();
    expect(screen.getByText("Picture")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("re-levels its headings", () => {
    render(<FeaturesBentoBlock headingLevel={1} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
  });

  it("lets a consumer className win and forwards refs", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<FeaturesBentoBlock ref={ref} className="py-2" />);
    expect(root(container)).toHaveClass("py-2");
    expect(root(container)).not.toHaveClass("py-16");
    expect(ref.current).toBe(root(container));
  });

  it("reveals a grid below the fold once it scrolls into view", () => {
    const observer = stubObserver();
    belowFold();
    const { container } = render(<FeaturesBentoBlock />);
    expect(root(container)).toHaveAttribute("data-reveal", "pending");
    act(() => {
      observer.fire();
    });
    expect(root(container)).toHaveAttribute("data-reveal", "shown");
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it("hides nothing on screen, under reduced motion, or without an observer", () => {
    stubObserver();
    const onScreen = render(<FeaturesBentoBlock />);
    expect(root(onScreen.container)).not.toHaveAttribute("data-reveal");
    onScreen.unmount();

    belowFold();
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const reduced = render(<FeaturesBentoBlock />);
    expect(root(reduced.container)).not.toHaveAttribute("data-reveal");
    reduced.unmount();

    vi.stubGlobal("IntersectionObserver", undefined);
    const unsupported = render(<FeaturesBentoBlock />);
    expect(root(unsupported.container)).not.toHaveAttribute("data-reveal");
  });

  it("has no axe violations", async () => {
    const { container } = render(<FeaturesBentoBlock />);
    await expectNoA11yViolations(container);
  });
});
