import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ShimmerSkeleton, ShimmerSkeletonShape } from "./shimmer-skeleton";

describe("ShimmerSkeleton", () => {
  it("is a busy status named by its label", () => {
    render(<ShimmerSkeleton />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading");
    expect(status).toHaveAttribute("aria-busy", "true");
  });

  it("takes a custom label, or stays silent with an empty one", () => {
    const { rerender } = render(<ShimmerSkeleton label="Loading profile" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading profile");
    rerender(<ShimmerSkeleton label="" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("draws the preset card when given no children", () => {
    const { container } = render(<ShimmerSkeleton />);
    const shapes = [...container.querySelectorAll('[data-slot="shimmer-skeleton-shape"]')];
    expect(shapes.map((shape) => shape.getAttribute("data-shape"))).toEqual([
      "circle",
      "line",
      "line",
      "block",
    ]);
  });

  it("renders composed shapes instead of the preset", () => {
    const { container } = render(
      <ShimmerSkeleton>
        <ShimmerSkeletonShape shape="block" data-testid="hero" />
      </ShimmerSkeleton>,
    );
    expect(screen.getByTestId("hero")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll('[data-slot="shimmer-skeleton-shape"]')).toHaveLength(1);
  });

  it("hides the sheen from assistive technology and can turn it off", () => {
    const { container, rerender } = render(<ShimmerSkeleton />);
    const sheen = container.querySelector('[data-slot="shimmer-skeleton-sheen"]');
    expect(sheen).toHaveAttribute("aria-hidden", "true");
    rerender(<ShimmerSkeleton shimmer={false} />);
    expect(container.querySelector('[data-slot="shimmer-skeleton-sheen"]')).toBeNull();
  });

  it("runs the sweep on the motion scale", () => {
    render(<ShimmerSkeleton />);
    const css = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("");
    expect(css).toContain("@keyframes dowel-shimmer-skeleton-sweep");
    expect(css).toContain("var(--motion-scale, 1)");
  });

  it.each([
    ["sm", "w-40"],
    ["md", "w-56"],
    ["lg", "w-72"],
  ] as const)("applies the %s size", (size, expected) => {
    render(<ShimmerSkeleton size={size} />);
    expect(screen.getByRole("status")).toHaveClass(expected);
  });

  it("merges className and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ShimmerSkeleton ref={ref} className="w-full rounded-md" data-testid="sk" />);
    const element = screen.getByTestId("sk");
    expect(ref.current).toBe(element);
    expect(element).toHaveClass("w-full", "rounded-md");
    expect(element).not.toHaveClass("w-56", "rounded-2xl");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ShimmerSkeleton />);
    await expectNoA11yViolations(container);
  });
});
