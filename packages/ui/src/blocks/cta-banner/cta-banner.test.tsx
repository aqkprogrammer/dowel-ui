import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CtaBannerBlock } from "./cta-banner";

function stylesheet(): string {
  return [...document.querySelectorAll("style")].map((node) => node.textContent).join("\n");
}

/** A controllable IntersectionObserver. */
function mockIntersectionObserver() {
  const instances: { callback: IntersectionObserverCallback; disconnect: () => void }[] = [];
  class MockObserver {
    disconnect = vi.fn();
    constructor(public callback: IntersectionObserverCallback) {
      instances.push(this);
    }
    observe() {}
    unobserve() {}
  }
  vi.stubGlobal("IntersectionObserver", MockObserver);
  return {
    instances,
    enter(isIntersecting = true) {
      act(() => {
        for (const instance of instances) {
          instance.callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            {} as IntersectionObserver,
          );
        }
      });
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CtaBannerBlock", () => {
  it("is one section landmark named by its headline", () => {
    render(<CtaBannerBlock />);
    expect(screen.getByRole("region", { name: "Start building today" })).toBeInTheDocument();
  });

  it("renders the headline at level 2 by default, and at any level asked for", () => {
    const { rerender } = render(<CtaBannerBlock />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    rerender(<CtaBannerBlock headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("renders its copy and a real link from props", () => {
    render(
      <CtaBannerBlock
        title="Try it"
        description="Free."
        action={{ label: "Install", href: "/install" }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Try it" })).toBeInTheDocument();
    expect(screen.getByText("Free.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Install" });
    expect(link).toHaveAttribute("href", "/install");
    expect(link.querySelector("svg")).toHaveClass("rtl:-scale-x-100");
  });

  it("hides the description and action when empty or null", () => {
    render(<CtaBannerBlock description="" action={null} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  it("is a Card surface", () => {
    const { container } = render(<CtaBannerBlock />);
    const panel = container.querySelector("[data-slot=cta-banner-panel]");
    expect(panel).toHaveClass("rounded-2xl", "border");
    expect(panel).not.toHaveClass("rounded-xl");
  });

  it("renders at rest where scrolling into view cannot be observed", () => {
    const { container } = render(<CtaBannerBlock />);
    expect(container.querySelector("[data-slot=cta-banner-panel]")).toHaveAttribute(
      "data-state",
      "static",
    );
  });

  it("waits for the first scroll into view, then plays once", () => {
    const observer = mockIntersectionObserver();
    const { container } = render(<CtaBannerBlock />);
    const panel = () => container.querySelector("[data-slot=cta-banner-panel]");
    expect(panel()).toHaveAttribute("data-state", "idle");
    observer.enter(false);
    expect(panel()).toHaveAttribute("data-state", "idle");
    observer.enter();
    expect(panel()).toHaveAttribute("data-state", "visible");
    expect(observer.instances[0]?.disconnect).toHaveBeenCalled();
  });

  it("runs every duration through the motion scale and never loops", () => {
    render(<CtaBannerBlock />);
    const css = stylesheet();
    expect(css).toContain("@keyframes dowel-cta-banner-settle{");
    expect(css).not.toContain("infinite");
    for (const match of css.matchAll(/(\d+)ms/g)) {
      expect(css.slice(match.index, match.index + 40)).toContain("var(--motion-scale");
    }
  });

  it("merges a consumer className, forwards the ref and native props", () => {
    const ref = createRef<HTMLElement>();
    render(<CtaBannerBlock ref={ref} className="py-4" data-testid="cta" />);
    const section = screen.getByTestId("cta");
    expect(ref.current).toBe(section);
    expect(section).toHaveClass("py-4");
    expect(section).not.toHaveClass("py-12");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<CtaBannerBlock />);
    await expectNoA11yViolations(container);
  });
});
