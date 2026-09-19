import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { HeroMinimalBlock } from "./hero-minimal";

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

describe("HeroMinimalBlock", () => {
  it("is one section landmark named by its headline", () => {
    render(<HeroMinimalBlock />);
    expect(screen.getByRole("region", { name: "Less is more" })).toBeInTheDocument();
  });

  it("renders the headline at level 2 by default, and at any level asked for", () => {
    const { rerender } = render(<HeroMinimalBlock />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    rerender(<HeroMinimalBlock headingLevel={1} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders its copy and a real link from props", () => {
    render(
      <HeroMinimalBlock
        title="Quiet"
        description="Very."
        action={{ label: "Browse", href: "/browse" }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Quiet" })).toBeInTheDocument();
    expect(screen.getByText("Very.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Browse" });
    expect(link).toHaveAttribute("href", "/browse");
    expect(link).toHaveClass("underline");
  });

  it("hides the description and link when empty or null", () => {
    render(<HeroMinimalBlock description="" action={null} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  it("mirrors the link's arrow in right-to-left text", () => {
    render(<HeroMinimalBlock />);
    const arrow = screen.getByRole("link").querySelector("svg");
    expect(arrow).toHaveAttribute("aria-hidden", "true");
    expect(arrow).toHaveClass("rtl:-scale-x-100");
  });

  it("renders at rest where scrolling into view cannot be observed", () => {
    const { container } = render(<HeroMinimalBlock />);
    expect(container.querySelector("[data-slot=hero-minimal-content]")).toHaveAttribute(
      "data-state",
      "static",
    );
  });

  it("waits for the first scroll into view, then plays once", () => {
    const observer = mockIntersectionObserver();
    const { container } = render(<HeroMinimalBlock />);
    const content = () => container.querySelector("[data-slot=hero-minimal-content]");
    expect(content()).toHaveAttribute("data-state", "idle");
    observer.enter(false);
    expect(content()).toHaveAttribute("data-state", "idle");
    observer.enter();
    expect(content()).toHaveAttribute("data-state", "visible");
    expect(observer.instances[0]?.disconnect).toHaveBeenCalled();
  });

  it("runs every duration through the motion scale and never loops", () => {
    render(<HeroMinimalBlock />);
    const css = stylesheet();
    expect(css).toContain("@keyframes dowel-hero-minimal-gather{from{letter-spacing:0.05em}}");
    expect(css).not.toContain("infinite");
    for (const match of css.matchAll(/(\d+)ms/g)) {
      expect(css.slice(match.index, match.index + 40)).toContain("var(--motion-scale");
    }
  });

  it("merges a consumer className, forwards the ref and native props", () => {
    const ref = createRef<HTMLElement>();
    render(<HeroMinimalBlock ref={ref} className="py-8" data-testid="hero" />);
    const section = screen.getByTestId("hero");
    expect(ref.current).toBe(section);
    expect(section).toHaveClass("py-8");
    expect(section).not.toHaveClass("py-24");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<HeroMinimalBlock headingLevel={1} />);
    await expectNoA11yViolations(container);
  });
});
