import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TextLoader, textLoaderVariantNames } from "./text-loader";

function root(container: HTMLElement) {
  return container.querySelector('[data-slot="text-loader"]');
}

describe("TextLoader", () => {
  it("is hidden from assistive technology by default", () => {
    const { container } = render(<TextLoader />);
    expect(root(container)).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces itself when given a label", () => {
    render(<TextLoader label="Loading results" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading results");
  });

  it("is an indicator, so reduced motion slows it rather than stopping it", () => {
    const { container } = render(<TextLoader />);
    expect(root(container)).toHaveAttribute("data-motion", "indicator");
  });

  it.each(textLoaderVariantNames)("renders the %s variant with moving parts", (variant) => {
    const { container } = render(<TextLoader variant={variant} />);
    const element = root(container);
    expect(element).toHaveAttribute("data-variant", variant);
    const animated = [...(element?.querySelectorAll<HTMLElement>("[data-part]") ?? [])].filter(
      (part) => part.style.animationName.startsWith("dowel-text-loader-"),
    );
    expect(animated.length).toBeGreaterThan(0);
  });

  it("scales every duration through the indicator motion scale", () => {
    const { container } = render(<TextLoader variant="typing-indicator" />);
    const part = container.querySelector<HTMLElement>("[data-part=dot]");
    expect(part?.style.getPropertyValue("--dur")).toContain("var(--motion-scale-indicator");
    expect(part?.style.getPropertyValue("--delay")).toContain("var(--motion-scale-indicator");
  });

  it("defines every keyframe it references", () => {
    const { container } = render(
      <>
        {textLoaderVariantNames.map((variant) => (
          <TextLoader key={variant} variant={variant} />
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

  it("shows the text it is given, and morphs between the words it is given", () => {
    const { container, rerender } = render(<TextLoader text="Saving" variant="typing" />);
    expect(root(container)).toHaveTextContent("Saving");
    rerender(<TextLoader variant="morph" words={["Syncing", "Almost"]} />);
    expect(root(container)).toHaveTextContent("Syncing");
    expect(root(container)).toHaveTextContent("Almost");
  });

  it.each([
    ["sm", "text-[0.75rem]"],
    ["md", "text-[1rem]"],
    ["lg", "text-[1.25rem]"],
    ["xl", "text-[1.5rem]"],
  ] as const)("applies the %s size", (size, expectedClass) => {
    const { container } = render(<TextLoader size={size} />);
    expect(root(container)).toHaveClass(expectedClass);
  });

  it("merges a consumer className and style over the variant layout", () => {
    const { container } = render(
      <TextLoader className="text-primary" style={{ gap: "2em" }} variant="shimmer" />,
    );
    const element = root(container) as HTMLElement;
    expect(element).toHaveClass("text-primary");
    expect(element.style.gap).toBe("2em");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<TextLoader label="Loading" />);
    await expectNoA11yViolations(container);
  });
});
