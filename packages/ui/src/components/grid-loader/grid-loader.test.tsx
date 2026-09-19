import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { GridLoader, gridLoaderAliases, gridLoaderVariantNames } from "./grid-loader";

function root(container: HTMLElement) {
  return container.querySelector('[data-slot="grid-loader"]');
}

describe("GridLoader", () => {
  it("is hidden from assistive technology by default", () => {
    const { container } = render(<GridLoader />);
    expect(root(container)).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces itself when given a label", () => {
    render(<GridLoader label="Loading results" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading results");
  });

  it("is an indicator, so reduced motion slows it rather than stopping it", () => {
    const { container } = render(<GridLoader />);
    expect(root(container)).toHaveAttribute("data-motion", "indicator");
  });

  it("defaults to the plus-hollow pattern", () => {
    const { container } = render(<GridLoader />);
    expect(root(container)).toHaveAttribute("data-variant", "plus-hollow");
  });

  it.each(gridLoaderVariantNames)("renders the %s variant with moving parts", (variant) => {
    const { container } = render(<GridLoader variant={variant} />);
    const element = root(container);
    expect(element).toHaveAttribute("data-variant", variant);
    const animated = [...(element?.querySelectorAll<HTMLElement>("[data-part]") ?? [])].filter(
      (part) => part.style.animationName.startsWith("dowel-grid-loader-"),
    );
    expect(animated.length).toBeGreaterThan(0);
  });

  it("scales every duration through the indicator motion scale", () => {
    const { container } = render(<GridLoader mode="stagger" />);
    const part = container.querySelector<HTMLElement>("[data-part=cell]");
    expect(part?.style.getPropertyValue("--dur")).toContain("var(--motion-scale-indicator");
    expect(part?.style.getPropertyValue("--delay")).toContain("var(--motion-scale-indicator");
  });

  it("defines every keyframe it references", () => {
    const { container } = render(
      <>
        {gridLoaderVariantNames.map((variant) => (
          <GridLoader key={variant} variant={variant} />
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

  it("lights only the cells in the pattern", () => {
    const { container } = render(<GridLoader variant="corners" />);
    expect(container.querySelectorAll("[data-part=cell]")).toHaveLength(4);
    expect(container.querySelectorAll("[data-part=empty]")).toHaveLength(5);
  });

  it("staggers the lit cells in reading order", () => {
    const { container } = render(<GridLoader mode="stagger" variant="corners" />);
    const delays = [...container.querySelectorAll<HTMLElement>("[data-part=cell]")].map(
      (part) => part.style.getPropertyValue("--delay"),
    );
    expect(new Set(delays).size).toBe(4);
    for (const part of container.querySelectorAll<HTMLElement>("[data-part=cell]")) {
      expect(part.style.animationName).toBe("dowel-grid-loader-stagger");
    }
  });

  it.each(Object.entries(gridLoaderAliases))(
    "renders the %s alias as its canonical %s pattern",
    (alias, target) => {
      const shape = (variant: string) =>
        [...(root(render(<GridLoader variant={variant as never} />).container)?.children ?? [])]
          .map((part) => part.getAttribute("data-part"))
          .join();
      expect(gridLoaderVariantNames).toContain(alias);
      expect(shape(alias)).toBe(shape(target));
    },
  );

  it("maps speed onto the cycle length", () => {
    const { container } = render(<GridLoader speed="slow" />);
    const part = container.querySelector<HTMLElement>("[data-part=cell]");
    expect(part?.style.getPropertyValue("--dur")).toContain("1.5s");
  });

  it("flags rounded and glowing cells on the root", () => {
    const { container } = render(<GridLoader glow rounded />);
    expect(root(container)).toHaveAttribute("data-rounded");
    expect(root(container)).toHaveAttribute("data-glow");
  });

  it.each([
    ["sm", "text-[0.25rem]"],
    ["md", "text-[0.375rem]"],
    ["lg", "text-[0.5rem]"],
    ["xl", "text-[0.625rem]"],
  ] as const)("applies the %s size", (size, expectedClass) => {
    const { container } = render(<GridLoader size={size} />);
    expect(root(container)).toHaveClass(expectedClass);
  });

  it("merges a consumer className and style over the variant layout", () => {
    const { container } = render(
      <GridLoader className="text-primary" style={{ gap: "2em" }} variant="frame" />,
    );
    const element = root(container) as HTMLElement;
    expect(element).toHaveClass("text-primary");
    expect(element.style.gap).toBe("2em");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<GridLoader label="Loading" />);
    await expectNoA11yViolations(container);
  });
});
