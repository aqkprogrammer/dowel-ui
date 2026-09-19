import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CtaCenteredBlock } from "./cta-centered";

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

describe("CtaCenteredBlock", () => {
  it("is one section landmark named by its headline", () => {
    render(<CtaCenteredBlock />);
    expect(
      screen.getByRole("region", { name: "Ready to build something great?" }),
    ).toBeInTheDocument();
  });

  it("renders the headline at level 2 by default, and at any level asked for", () => {
    const { rerender } = render(<CtaCenteredBlock />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    rerender(<CtaCenteredBlock headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("renders its copy and actions from props, and hides what is null or empty", () => {
    const { rerender } = render(
      <CtaCenteredBlock
        title="Go"
        description="Now."
        primaryAction={{ label: "Sign up", href: "/signup" }}
        secondaryAction={{ label: "Pricing", href: "/pricing" }}
      />,
    );
    expect(screen.getByText("Now.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");

    rerender(<CtaCenteredBlock description="" primaryAction={null} secondaryAction={null} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();

    rerender(<CtaCenteredBlock primaryAction={null} />);
    expect(screen.getByRole("link", { name: "Learn more" })).toBeInTheDocument();
    rerender(<CtaCenteredBlock secondaryAction={null} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("renders at rest where scrolling into view cannot be observed", () => {
    const { container } = render(<CtaCenteredBlock />);
    expect(container.querySelector("[data-slot=cta-centered-content]")).toHaveAttribute(
      "data-state",
      "static",
    );
  });

  it("waits for the first scroll into view, then plays once", () => {
    const observer = mockIntersectionObserver();
    const { container } = render(<CtaCenteredBlock />);
    const content = () => container.querySelector("[data-slot=cta-centered-content]");
    expect(content()).toHaveAttribute("data-state", "idle");
    observer.enter(false);
    expect(content()).toHaveAttribute("data-state", "idle");
    observer.enter();
    expect(content()).toHaveAttribute("data-state", "visible");
    expect(observer.instances[0]?.disconnect).toHaveBeenCalled();
  });

  it("runs every duration through the motion scale and never loops", () => {
    render(<CtaCenteredBlock />);
    const css = stylesheet();
    expect(css).toContain("@keyframes dowel-cta-centered-rise{");
    expect(css).not.toContain("infinite");
    for (const match of css.matchAll(/(\d+)ms/g)) {
      expect(css.slice(match.index, match.index + 40)).toContain("var(--motion-scale");
    }
  });

  it("merges a consumer className, forwards the ref and native props", () => {
    const ref = createRef<HTMLElement>();
    render(<CtaCenteredBlock ref={ref} className="bg-card" data-testid="cta" />);
    const section = screen.getByTestId("cta");
    expect(ref.current).toBe(section);
    expect(section).toHaveClass("bg-card");
    expect(section).not.toHaveClass("bg-muted/50");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<CtaCenteredBlock />);
    await expectNoA11yViolations(container);
  });
});
