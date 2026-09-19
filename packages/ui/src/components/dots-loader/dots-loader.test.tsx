import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DotsLoader, dotsLoaderVariantNames } from "./dots-loader";

function root(container: HTMLElement) {
  return container.querySelector('[data-slot="dots-loader"]');
}

describe("DotsLoader", () => {
  it("is hidden from assistive technology by default", () => {
    const { container } = render(<DotsLoader />);
    expect(root(container)).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces itself when given a label", () => {
    render(<DotsLoader label="Loading results" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading results");
  });

  it("is an indicator, so reduced motion slows it rather than stopping it", () => {
    const { container } = render(<DotsLoader />);
    expect(root(container)).toHaveAttribute("data-motion", "indicator");
  });

  it.each(dotsLoaderVariantNames)("renders the %s variant with moving parts", (variant) => {
    const { container } = render(<DotsLoader variant={variant} />);
    const element = root(container);
    expect(element).toHaveAttribute("data-variant", variant);
    const animated = [...(element?.querySelectorAll<HTMLElement>("[data-part]") ?? [])].filter(
      (part) => part.style.animationName.startsWith("dowel-dots-loader-"),
    );
    expect(animated.length).toBeGreaterThan(0);
  });

  it("scales every duration through the indicator motion scale", () => {
    const { container } = render(<DotsLoader variant="bounce" />);
    const part = container.querySelector<HTMLElement>("[data-part=dot]");
    expect(part?.style.getPropertyValue("--dur")).toContain("var(--motion-scale-indicator");
    expect(part?.style.getPropertyValue("--delay")).toContain("var(--motion-scale-indicator");
  });

  it("defines every keyframe it references", () => {
    const { container } = render(
      <>
        {dotsLoaderVariantNames.map((variant) => (
          <DotsLoader key={variant} variant={variant} />
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

  it("gives each goo filter a unique id", () => {
    const { container } = render(
      <>
        <DotsLoader variant="liquid" />
        <DotsLoader variant="liquid" />
      </>,
    );
    const ids = [...container.querySelectorAll("filter")].map((node) => node.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it.each([
    ["sm", "text-[0.25rem]"],
    ["md", "text-[0.375rem]"],
    ["lg", "text-[0.5rem]"],
    ["xl", "text-[0.625rem]"],
  ] as const)("applies the %s size", (size, expectedClass) => {
    const { container } = render(<DotsLoader size={size} />);
    expect(root(container)).toHaveClass(expectedClass);
  });

  it("merges a consumer className and style over the variant layout", () => {
    const { container } = render(
      <DotsLoader className="text-primary" style={{ gap: "2em" }} variant="pulse" />,
    );
    const element = root(container) as HTMLElement;
    expect(element).toHaveClass("text-primary");
    expect(element.style.gap).toBe("2em");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<DotsLoader label="Loading" />);
    await expectNoA11yViolations(container);
  });
});
