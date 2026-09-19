import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { BarLoader, barLoaderVariantNames } from "./bar-loader";

function root(container: HTMLElement) {
  return container.querySelector('[data-slot="bar-loader"]');
}

describe("BarLoader", () => {
  it("is hidden from assistive technology by default", () => {
    const { container } = render(<BarLoader />);
    expect(root(container)).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces itself when given a label", () => {
    render(<BarLoader label="Loading results" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading results");
  });

  it("is an indicator, so reduced motion slows it rather than stopping it", () => {
    const { container } = render(<BarLoader />);
    expect(root(container)).toHaveAttribute("data-motion", "indicator");
  });

  it("defaults to the cascade", () => {
    const { container } = render(<BarLoader />);
    expect(root(container)).toHaveAttribute("data-variant", "cascade");
  });

  it.each(barLoaderVariantNames)("renders the %s variant with moving parts", (variant) => {
    const { container } = render(<BarLoader variant={variant} />);
    const element = root(container);
    expect(element).toHaveAttribute("data-variant", variant);
    const animated = [...(element?.querySelectorAll<HTMLElement>("[data-part]") ?? [])].filter(
      (part) => part.style.animationName.startsWith("dowel-bar-loader-"),
    );
    expect(animated.length).toBeGreaterThan(0);
  });

  it("scales every duration through the indicator motion scale", () => {
    const { container } = render(<BarLoader variant="cascade" />);
    const part = container.querySelector<HTMLElement>("[data-part=bar]");
    expect(part?.style.getPropertyValue("--dur")).toContain("var(--motion-scale-indicator");
    expect(part?.style.getPropertyValue("--delay")).toContain("var(--motion-scale-indicator");
  });

  it("defines every keyframe it references", () => {
    const { container } = render(
      <>
        {barLoaderVariantNames.map((variant) => (
          <BarLoader key={variant} variant={variant} />
        ))}
      </>,
    );
    const stylesheet = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("\n");
    const names = new Set(
      [...container.querySelectorAll<HTMLElement>("[style]")]
        .map((node) => node.style.animationName)
        .filter(Boolean),
    );
    for (const name of names) {
      expect(stylesheet).toContain(`@keyframes ${name}{`);
    }
  });

  it("never reports a value from the indeterminate sweep", () => {
    const { container } = render(<BarLoader variant="indeterminate" label="Loading" />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(container.querySelector("[aria-valuenow]")).toBeNull();
  });

  it.each([
    ["sm", "text-[0.25rem]"],
    ["md", "text-[0.375rem]"],
    ["lg", "text-[0.5rem]"],
    ["xl", "text-[0.625rem]"],
  ] as const)("applies the %s size", (size, expectedClass) => {
    const { container } = render(<BarLoader size={size} />);
    expect(root(container)).toHaveClass(expectedClass);
  });

  it("merges a consumer className and style over the variant layout", () => {
    const { container } = render(
      <BarLoader className="text-primary" style={{ gap: "2em" }} variant="cascade" />,
    );
    const element = root(container) as HTMLElement;
    expect(element).toHaveClass("text-primary");
    expect(element.style.gap).toBe("2em");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<BarLoader label="Loading" />);
    await expectNoA11yViolations(container);
  });
});
