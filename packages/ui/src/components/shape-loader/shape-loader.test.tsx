import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ShapeLoader, shapeLoaderVariantNames } from "./shape-loader";

function root(container: HTMLElement) {
  return container.querySelector('[data-slot="shape-loader"]');
}

describe("ShapeLoader", () => {
  it("is hidden from assistive technology by default", () => {
    const { container } = render(<ShapeLoader />);
    expect(root(container)).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces itself when given a label", () => {
    render(<ShapeLoader label="Loading results" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading results");
  });

  it("is an indicator, so reduced motion slows it rather than stopping it", () => {
    const { container } = render(<ShapeLoader />);
    expect(root(container)).toHaveAttribute("data-motion", "indicator");
  });

  it("defaults to the flip square", () => {
    const { container } = render(<ShapeLoader />);
    expect(root(container)).toHaveAttribute("data-variant", "flip-square");
  });

  it("has 35 variants", () => {
    expect(shapeLoaderVariantNames).toHaveLength(35);
  });

  it.each(shapeLoaderVariantNames)("renders the %s variant with moving parts", (variant) => {
    const { container } = render(<ShapeLoader variant={variant} />);
    const element = root(container);
    expect(element).toHaveAttribute("data-variant", variant);
    const animated = [...(element?.querySelectorAll<HTMLElement>("[data-part]") ?? [])].filter(
      (part) => part.style.animationName.startsWith("dowel-shape-loader-"),
    );
    expect(animated.length).toBeGreaterThan(0);
  });

  it("scales every duration through the indicator motion scale", () => {
    const { container } = render(<ShapeLoader variant="square-grid" />);
    const part = container.querySelector<HTMLElement>("[data-part=shape]");
    expect(part?.style.getPropertyValue("--dur")).toContain("var(--motion-scale-indicator");
    expect(part?.style.getPropertyValue("--delay")).toContain("var(--motion-scale-indicator");
  });

  it("defines every keyframe it references", () => {
    const { container } = render(
      <>
        {shapeLoaderVariantNames.map((variant) => (
          <ShapeLoader key={variant} variant={variant} />
        ))}
      </>,
    );
    const stylesheet = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("\n");
    const names = new Set(
      [...container.querySelectorAll<HTMLElement | SVGElement>("[style]")]
        .map((node) => node.style.animationName)
        .filter(Boolean),
    );
    expect(names.size).toBeGreaterThan(20);
    for (const name of names) {
      expect(stylesheet).toContain(`@keyframes ${name}{`);
    }
  });

  it("approximates the source's springs with the overshoot curve", () => {
    const { container } = render(<ShapeLoader variant="cube-flip-spring" />);
    const part = container.querySelector<HTMLElement>("[data-part=shape]");
    expect(part?.style.animationTimingFunction).toContain("--ease-overshoot");
  });

  it.each([
    ["sm", "text-[0.25rem]"],
    ["md", "text-[0.375rem]"],
    ["lg", "text-[0.5rem]"],
    ["xl", "text-[0.625rem]"],
  ] as const)("applies the %s size", (size, expectedClass) => {
    const { container } = render(<ShapeLoader size={size} />);
    expect(root(container)).toHaveClass(expectedClass);
  });

  it("merges a consumer className and style over the variant layout", () => {
    const { container } = render(
      <ShapeLoader className="text-primary" style={{ gap: "2em" }} variant="newtons-cradle" />,
    );
    const element = root(container) as HTMLElement;
    expect(element).toHaveClass("text-primary");
    expect(element.style.gap).toBe("2em");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ShapeLoader label="Loading" />);
    await expectNoA11yViolations(container);
  });
});
