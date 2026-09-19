import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ShimmerText } from "./shimmer-text";

function root(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>('[data-slot="shimmer-text"]');
  if (!element) throw new Error("no shimmer-text root");
  return element;
}

function stylesheet(): string {
  return [...document.querySelectorAll("style")].map((node) => node.textContent).join("\n");
}

/** An IntersectionObserver the test can fire by hand. */
function mockIntersectionObserver() {
  const instances: { callback: IntersectionObserverCallback; disconnect: () => void }[] = [];
  class MockObserver {
    callback: IntersectionObserverCallback;
    disconnect = vi.fn();
    observe = vi.fn();
    unobserve = vi.fn();
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      instances.push(this);
    }
  }
  vi.stubGlobal("IntersectionObserver", MockObserver);
  return {
    enter() {
      act(() => {
        for (const instance of instances) {
          instance.callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            instance as unknown as IntersectionObserver,
          );
        }
      });
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ShimmerText", () => {
  it("keeps the text as one readable run", () => {
    render(<ShimmerText>Shipping soon</ShimmerText>);
    expect(screen.getByText("Shipping soon")).toHaveAttribute("data-slot", "shimmer-text");
  });

  it("loops the shine by default, holding for the repeat delay at the end of each pass", () => {
    const { container } = render(<ShimmerText>Shipping soon</ShimmerText>);
    const element = root(container);
    expect(element).toHaveAttribute("data-variant", "shine");
    // 2500ms pass + 600ms pause: the band travels for 81% of each 3100ms loop.
    expect(element.style.animationName).toBe("dowel-shimmer-text-shine-81");
    expect(element.style.animationDuration).toBe("calc(3100ms * var(--motion-scale, 1))");
    expect(element.style.animationIterationCount).toBe("infinite");
    expect(element.style.animationTimingFunction).toBe("linear");
    expect(stylesheet()).toContain(
      "@keyframes dowel-shimmer-text-shine-81{0%{background-position-x:150%}81%,100%{background-position-x:-150%}}",
    );
  });

  it("takes custom duration and repeat delay", () => {
    const { container } = render(
      <ShimmerText duration={2000} repeatDelay={0}>
        A light sweep across the text.
      </ShimmerText>,
    );
    const element = root(container);
    expect(element.style.animationName).toBe("dowel-shimmer-text-shine-100");
    expect(element.style.animationDuration).toBe("calc(2000ms * var(--motion-scale, 1))");
    expect(stylesheet()).toContain(
      "@keyframes dowel-shimmer-text-shine-100{0%{background-position-x:150%}100%{background-position-x:-150%}}",
    );
  });

  it('plays a single pass with repeat="once", with no pause', () => {
    const { container } = render(<ShimmerText repeat="once">Once</ShimmerText>);
    const element = root(container);
    expect(element.style.animationIterationCount).toBe("1");
    expect(element.style.animationDuration).toBe("calc(2500ms * var(--motion-scale, 1))");
    expect(element.style.animationFillMode).toBe("both");
  });

  it("paints with theme tokens by default and accepts other colours", () => {
    const { container, rerender } = render(<ShimmerText>Text</ShimmerText>);
    expect(root(container).style.getPropertyValue("--dowel-shimmer-text-base")).toBe(
      "var(--color-muted-foreground)",
    );
    expect(root(container).style.getPropertyValue("--dowel-shimmer-text-shine")).toBe(
      "var(--color-foreground)",
    );
    rerender(
      <ShimmerText baseColor="var(--color-primary)" shineColor="var(--color-background)">
        Text
      </ShimmerText>,
    );
    expect(root(container).style.getPropertyValue("--dowel-shimmer-text-base")).toBe(
      "var(--color-primary)",
    );
  });

  it("plays the sweep entrance once, on the source's timing and easing", () => {
    const { container } = render(
      <ShimmerText variant="sweep" delay={400}>
        Motion is meaning.
      </ShimmerText>,
    );
    const element = root(container);
    expect(element).toHaveAttribute("data-variant", "sweep");
    expect(element.style.animationName).toBe("dowel-shimmer-text-sweep");
    expect(element.style.animationDuration).toBe("calc(850ms * var(--motion-scale, 1))");
    expect(element.style.animationDelay).toBe("calc(400ms * var(--motion-scale, 1))");
    expect(element.style.animationTimingFunction).toBe("var(--ease-out-quint)");
    expect(element.style.animationIterationCount).toBe("1");
    expect(element.style.animationFillMode).toBe("both");
  });

  it("ignores repeat for the sweep, which is an entrance", () => {
    const { container } = render(
      <ShimmerText variant="sweep" repeat="loop">
        Entrance
      </ShimmerText>,
    );
    expect(root(container).style.animationIterationCount).toBe("1");
  });

  it("settles on readable text: the sweep ends visible and reduced motion drops the shine gradient", () => {
    render(<ShimmerText variant="sweep">Entrance</ShimmerText>);
    const css = stylesheet();
    expect(css).toMatch(
      /@keyframes dowel-shimmer-text-sweep\{from\{[^}]*\}to\{opacity:1;filter:blur\(0\);transform:none\}\}/,
    );
    expect(css).toContain(
      "@media (prefers-reduced-motion:reduce){[data-slot=shimmer-text][data-variant=shine]{background-image:none;",
    );
    expect(css).toContain("@media (forced-colors:active)");
    // Decoration, not an indicator: the reduced-motion blanket applies.
    expect(screen.getByText("Entrance")).not.toHaveAttribute("data-motion");
  });

  it("glides from the inline start, mirrored in right-to-left text", () => {
    render(<ShimmerText variant="sweep">Entrance</ShimmerText>);
    expect(stylesheet()).toContain(
      "[data-slot=shimmer-text][data-variant=sweep]:dir(rtl){--dowel-shimmer-text-x:22px}",
    );
  });

  it("waits for the text to scroll into view when triggerOnView is set", () => {
    const observer = mockIntersectionObserver();
    const { container } = render(
      <ShimmerText variant="sweep" triggerOnView>
        Later
      </ShimmerText>,
    );
    const element = root(container);
    expect(element).toHaveAttribute("data-state", "waiting");
    expect(element.style.animationName).toBe("none");

    observer.enter();
    expect(element).toHaveAttribute("data-state", "playing");
    expect(element.style.animationName).toBe("dowel-shimmer-text-sweep");
  });

  it("plays at once when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(
      <ShimmerText variant="sweep" triggerOnView>
        Now
      </ShimmerText>,
    );
    expect(root(container)).toHaveAttribute("data-state", "playing");
  });

  it("renders as the element asked for", () => {
    render(
      <ShimmerText as="h2" variant="sweep">
        Heading
      </ShimmerText>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Heading" })).toBeInTheDocument();
  });

  it("merges className and lets consumer style win", () => {
    const { container } = render(
      <ShimmerText className="font-bold" style={{ animationDuration: "1s" }}>
        Text
      </ShimmerText>,
    );
    expect(root(container)).toHaveClass("font-bold");
    expect(root(container).style.animationDuration).toBe("1s");
  });

  it("forwards its ref and native props", () => {
    const ref = createRef<HTMLElement>();
    render(
      <ShimmerText ref={ref} id="shine" title="Shine">
        Text
      </ShimmerText>,
    );
    expect(ref.current).toBe(screen.getByText("Text"));
    expect(ref.current).toHaveAttribute("id", "shine");
  });

  it("calls a callback ref", () => {
    const ref = vi.fn();
    render(<ShimmerText ref={ref}>Text</ShimmerText>);
    expect(ref).toHaveBeenCalledWith(screen.getByText("Text"));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div>
        <ShimmerText as="h1">Shipping soon</ShimmerText>
        <ShimmerText variant="sweep">Motion is meaning.</ShimmerText>
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
