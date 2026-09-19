import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { HeroSpotlightBlock } from "./hero-spotlight";

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

describe("HeroSpotlightBlock", () => {
  it("is one section landmark named by its headline", () => {
    render(<HeroSpotlightBlock />);
    expect(
      screen.getByRole("region", { name: "Build stunning interfaces" }),
    ).toBeInTheDocument();
  });

  it("renders the headline at level 2 by default, and at any level asked for", () => {
    const { rerender } = render(<HeroSpotlightBlock />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    rerender(<HeroSpotlightBlock headingLevel={1} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("is dark in every theme, through the theme's dark tokens", () => {
    render(<HeroSpotlightBlock data-testid="hero" />);
    expect(screen.getByTestId("hero")).toHaveClass("dark");
  });

  it("renders the copy and actions from props, and hides what is null or empty", () => {
    const { rerender } = render(
      <HeroSpotlightBlock
        title="Lights up"
        description="Copy."
        primaryAction={{ label: "Go", href: "/go" }}
        secondaryAction={{ label: "Read", href: "/read" }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Lights up" })).toBeInTheDocument();
    expect(screen.getByText("Copy.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute("href", "/go");
    expect(screen.getByRole("link", { name: "Read" })).toHaveAttribute("href", "/read");

    rerender(<HeroSpotlightBlock description="" primaryAction={null} secondaryAction={null} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();

    rerender(<HeroSpotlightBlock primaryAction={null} />);
    expect(screen.getByRole("link", { name: "Documentation" })).toBeInTheDocument();
    rerender(<HeroSpotlightBlock secondaryAction={null} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("renders at rest where scrolling into view cannot be observed", () => {
    const { container } = render(<HeroSpotlightBlock />);
    expect(container.querySelector("[data-slot=hero-spotlight-content]")).toHaveAttribute(
      "data-state",
      "static",
    );
  });

  it("waits for the first scroll into view, then plays once", () => {
    const observer = mockIntersectionObserver();
    const { container } = render(<HeroSpotlightBlock />);
    const content = () => container.querySelector("[data-slot=hero-spotlight-content]");
    const beam = () => container.querySelector("[data-slot=hero-spotlight-beam]");
    expect(content()).toHaveAttribute("data-state", "idle");

    observer.enter(false);
    expect(content()).toHaveAttribute("data-state", "idle");

    observer.enter();
    expect(content()).toHaveAttribute("data-state", "visible");
    expect(beam()).toHaveAttribute("data-state", "visible");
    expect(observer.instances[0]?.disconnect).toHaveBeenCalled();
  });

  it("keeps the beam and dust as hidden decoration that never loops forever", () => {
    const { container } = render(<HeroSpotlightBlock />);
    expect(container.querySelector("[data-slot=hero-spotlight-beam]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(container.querySelectorAll("[data-slot=hero-spotlight-mote]")).toHaveLength(20);
    const css = stylesheet();
    expect(css).not.toContain("infinite");
    expect(css).toMatch(/dowel-hero-spotlight-twinkle [^;]* 3 both/);
    for (const match of css.matchAll(/(\d+)ms/g)) {
      expect(css.slice(match.index, match.index + 40)).toContain("var(--motion-scale");
    }
    expect(css).toContain("calc(var(--period) * var(--motion-scale, 1))");
  });

  it("merges a consumer className, forwards the ref and native props", () => {
    const ref = createRef<HTMLElement>();
    render(<HeroSpotlightBlock ref={ref} className="mt-4" data-testid="hero" id="intro" />);
    const section = screen.getByTestId("hero");
    expect(ref.current).toBe(section);
    expect(section).toHaveClass("mt-4", "dark");
    expect(section).toHaveAttribute("id", "intro");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<HeroSpotlightBlock headingLevel={1} />);
    await expectNoA11yViolations(container);
  });
});
