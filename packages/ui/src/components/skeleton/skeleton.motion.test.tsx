import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Skeleton } from "./skeleton";

function stylesheet() {
  return document.querySelector<HTMLStyleElement>('style[data-href="dowel-skeleton"]');
}

describe("Skeleton shimmer", () => {
  it("pulses by default and names no variant", () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector("[data-slot='skeleton']");
    expect(skeleton).toHaveClass("animate-pulse-soft", "bg-muted");
    expect(skeleton).not.toHaveAttribute("data-variant");
  });

  it('sweeps a highlight instead of pulsing with variant="shimmer"', () => {
    const { container } = render(<Skeleton variant="shimmer" />);
    const skeleton = container.querySelector("[data-slot='skeleton']");
    expect(skeleton).toHaveAttribute("data-variant", "shimmer");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton).toHaveClass(
      "bg-muted",
      "animate-[dowel-skeleton-shimmer_calc(1.6s*var(--motion-scale))_linear_infinite]",
    );
    expect(skeleton).not.toHaveClass("animate-pulse-soft");
    expect(stylesheet()?.textContent).toContain("@keyframes dowel-skeleton-shimmer");
  });

  it("reverses the sweep in RTL", () => {
    render(<Skeleton variant="shimmer" />);
    expect(stylesheet()?.textContent).toContain(
      "[data-slot=skeleton][data-variant=shimmer]:dir(rtl){animation-direction:reverse}",
    );
  });

  it("times the sweep from --motion-scale, so reduced motion stops it", () => {
    const { container } = render(<Skeleton variant="shimmer" />);
    const animation = container
      .querySelector("[data-slot='skeleton']")
      ?.className.match(/animate-\[[^\]]*\]/)?.[0];
    expect(animation).toContain("var(--motion-scale)");
  });

  it("lets the consumer shape the shimmer", () => {
    const { container } = render(
      <Skeleton variant="shimmer" className="h-4 w-32 rounded-full" />,
    );
    const skeleton = container.querySelector("[data-slot='skeleton']");
    expect(skeleton).toHaveClass("h-4", "w-32", "rounded-full");
    expect(skeleton).not.toHaveClass("rounded-md");
  });

  it("forwards its ref", () => {
    let node: HTMLSpanElement | null = null;
    render(<Skeleton variant="shimmer" ref={(el) => void (node = el)} />);
    expect(node).toBeInstanceOf(HTMLSpanElement);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div aria-busy="true">
        <Skeleton variant="shimmer" className="h-4 w-32" />
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
