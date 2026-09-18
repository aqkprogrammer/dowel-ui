import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { RingLoader, ringLoaderVariantNames } from "./ring-loader";

function root(container: HTMLElement) {
  return container.querySelector('[data-slot="ring-loader"]');
}

describe("RingLoader", () => {
  it("is hidden from assistive technology by default", () => {
    const { container } = render(<RingLoader />);
    expect(root(container)).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces itself when given a label", () => {
    render(<RingLoader label="Loading results" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading results");
  });

  it("is an indicator, so reduced motion slows it rather than stopping it", () => {
    const { container } = render(<RingLoader />);
    expect(root(container)).toHaveAttribute("data-motion", "indicator");
  });

  it.each(ringLoaderVariantNames)("renders the %s variant with moving parts", (variant) => {
    const { container } = render(<RingLoader variant={variant} />);
    const element = root(container);
    expect(element).toHaveAttribute("data-variant", variant);
    const animated = [...(element?.querySelectorAll<HTMLElement>("[data-part]") ?? [])].filter(
      (part) => part.style.animationName.startsWith("dowel-ring-loader-"),
    );
    expect(animated.length).toBeGreaterThan(0);
  });

  it("scales every duration through the indicator motion scale", () => {
    const { container } = render(<RingLoader variant="dot-ring" />);
    const part = container.querySelector<HTMLElement>("[data-part=dot]");
    expect(part?.style.getPropertyValue("--dur")).toContain("var(--motion-scale-indicator");
    expect(part?.style.getPropertyValue("--delay")).toContain("var(--motion-scale-indicator");
  });

  it("defines every keyframe it references", () => {
    const { container } = render(
      <>
        {ringLoaderVariantNames.map((variant) => (
          <RingLoader key={variant} variant={variant} />
        ))}
      </>,
    );
    const stylesheet = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("\n");
    const names = new Set(
      [...container.querySelectorAll<HTMLElement>("[style]")]
        .flatMap((node) => node.style.animationName.split(","))
        .map((name) => name.trim())
        .filter(Boolean),
    );
    for (const name of names) {
      expect(stylesheet).toContain(`@keyframes ${name}{`);
    }
  });

  it("draws its SVG strokes in currentColor", () => {
    const { container } = render(
      <>
        {ringLoaderVariantNames.map((variant) => (
          <RingLoader key={variant} variant={variant} />
        ))}
      </>,
    );
    const svgs = [...container.querySelectorAll("svg")];
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg).toHaveAttribute("stroke", "currentColor");
    }
  });

  it.each([
    ["sm", "text-[0.25rem]"],
    ["md", "text-[0.375rem]"],
    ["lg", "text-[0.5rem]"],
    ["xl", "text-[0.625rem]"],
  ] as const)("applies the %s size", (size, expectedClass) => {
    const { container } = render(<RingLoader size={size} />);
    expect(root(container)).toHaveClass(expectedClass);
  });

  it("merges a consumer className and style over the variant layout", () => {
    const { container } = render(
      <RingLoader className="text-primary" style={{ gap: "2em" }} variant="classic" />,
    );
    const element = root(container) as HTMLElement;
    expect(element).toHaveClass("text-primary");
    expect(element.style.gap).toBe("2em");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<RingLoader label="Loading" />);
    await expectNoA11yViolations(container);
  });
});
