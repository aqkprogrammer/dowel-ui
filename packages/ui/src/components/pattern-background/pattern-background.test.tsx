import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  PATTERN_BACKGROUND_PATTERNS,
  PatternBackground,
  patternBackgroundStyle,
} from "./pattern-background";

const layer = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-slot=pattern-background-layer]");

describe("PatternBackground", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders children above an aria-hidden pattern that ignores the pointer", async () => {
    const { container } = render(
      <PatternBackground>
        <h2>Ship it</h2>
      </PatternBackground>,
    );
    const scene = container.querySelector("[data-slot=pattern-background-scene]");
    expect(scene).toHaveAttribute("aria-hidden", "true");
    expect(scene).toHaveClass("pointer-events-none");
    expect(container.querySelector("[data-slot=pattern-background-content]")).toContainElement(
      screen.getByRole("heading", { name: "Ship it" }),
    );
    await expectNoA11yViolations(container);
  });

  it("draws each pattern in the theme colour at the given size", () => {
    const { container, rerender } = render(<PatternBackground size={32} thickness={2} />);
    expect(layer(container)?.style.backgroundImage).toContain("radial-gradient");
    expect(layer(container)?.style.backgroundImage).toContain("var(--color-border) 2px");
    expect(layer(container)?.style.backgroundSize).toBe("32px 32px");
    rerender(<PatternBackground pattern="grid" color="primary" />);
    expect(layer(container)?.style.backgroundImage).toContain("var(--color-primary)");
    rerender(<PatternBackground pattern="noise" />);
    expect(layer(container)?.style.backgroundImage).toContain("feTurbulence");
    // Any CSS colour passes through. Checked on the style itself: jsdom's CSS
    // parser rejects a literal colour inside these gradients, browsers do not.
    expect(
      patternBackgroundStyle("dots", "oklch(0.7 0.1 250)", 24, 1).backgroundImage,
    ).toContain("oklch(0.7 0.1 250)");
  });

  it("clamps opacity and keeps a size it can draw", () => {
    const { container } = render(<PatternBackground opacity={3} size={1} />);
    const scene = container.querySelector<HTMLElement>("[data-slot=pattern-background-scene]");
    expect(scene?.style.opacity).toBe("1");
    expect(layer(container)?.style.backgroundSize).toBe("4px 4px");
  });

  it("drifts by one cell on a loop when asked, but never the grain", () => {
    const { container, rerender } = render(<PatternBackground />);
    expect(layer(container)?.style.animation).toBe("");
    rerender(<PatternBackground drift size={20} driftDuration={2} />);
    expect(layer(container)?.style.animation).toContain("dowel-pattern-background-drift");
    expect(layer(container)?.style.animation).toContain("calc(2s * var(--motion-scale, 1))");
    expect(layer(container)?.style.inset).toBe("-20px");
    expect(
      document.querySelector("style[data-href='dowel-pattern-background']")?.textContent,
    ).toContain("@keyframes dowel-pattern-background-drift");
    rerender(<PatternBackground drift pattern="noise" />);
    expect(layer(container)?.style.animation).toBe("");
  });

  it("pauses its drift while off-screen", () => {
    let report: (visible: boolean) => void = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          report = (visible) => {
            callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as never);
          };
        }
        observe() {}
        disconnect() {}
        unobserve() {}
        takeRecords() {
          return [];
        }
      },
    );
    const { container } = render(<PatternBackground drift />);
    const root = container.firstElementChild;
    expect(root).not.toHaveAttribute("data-paused");
    act(() => {
      report(false);
    });
    expect(root).toHaveAttribute("data-paused", "true");
  });

  it("applies the fade variants and lets className win a conflict", () => {
    const { container, rerender } = render(
      <PatternBackground fade="edges" className="isolation-auto" />,
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("mask-image:radial-gradient");
    expect(root).toHaveClass("isolation-auto");
    expect(root).not.toHaveClass("isolate");
    rerender(<PatternBackground fade="bottom" />);
    expect(root?.className).toContain("to_bottom");
  });

  it("forwards its ref and spreads props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<PatternBackground ref={ref} data-testid="bg" id="pattern" />);
    expect(ref.current).toBe(screen.getByTestId("bg"));
    expect(ref.current).toHaveAttribute("id", "pattern");
  });
});

describe("patternBackgroundStyle", () => {
  it("produces a background for every pattern", () => {
    for (const pattern of PATTERN_BACKGROUND_PATTERNS) {
      const style = patternBackgroundStyle(pattern, "red", 24, 1);
      expect(style.backgroundImage, pattern).toBeTruthy();
      expect(style.backgroundSize, pattern).toBeTruthy();
    }
  });
});
