import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { OrbitDots } from "./orbit-dots";

function root(container: HTMLElement) {
  return container.querySelector('[data-slot="orbit-dots"]') as HTMLElement;
}

describe("OrbitDots", () => {
  it("announces a status named by its label", () => {
    render(<OrbitDots label="Loading results" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading results");
  });

  it("defaults the label and can be silenced", () => {
    const { rerender } = render(<OrbitDots />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    rerender(<OrbitDots label="" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("hides the drawing and draws a core, a ring and two satellites", () => {
    const { container } = render(<OrbitDots />);
    const drawing = container.querySelector('[data-slot="orbit-dots-core"]')?.parentElement;
    expect(drawing).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector('[data-slot="orbit-dots-ring"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="orbit-dots-satellite"]')).toHaveLength(2);
  });

  it("is an indicator whose orbits run on the indicator scale at different speeds", () => {
    const { container } = render(<OrbitDots speed={2} />);
    expect(root(container)).toHaveAttribute("data-motion", "indicator");
    const durations = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="orbit-dots-layer"]'),
    ].map((layer) => layer.style.getPropertyValue("--dur"));
    expect(durations).toEqual([
      "calc(4s * var(--motion-scale-indicator, 1))",
      "calc(2.6s * var(--motion-scale-indicator, 1))",
    ]);
  });

  it.each([
    ["sm", "text-[0.625rem]"],
    ["md", "text-[0.875rem]"],
    ["lg", "text-[1.25rem]"],
  ] as const)("applies the %s size", (size, expected) => {
    const { container } = render(<OrbitDots size={size} />);
    expect(root(container)).toHaveClass(expected);
  });

  it("merges className and style, and forwards ref and props", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <OrbitDots
        ref={ref}
        className="text-primary"
        style={{ width: "4em" }}
        data-testid="orbit"
      />,
    );
    const element = screen.getByTestId("orbit");
    expect(ref.current).toBe(element);
    expect(element).toHaveClass("text-primary");
    expect(element).not.toHaveClass("text-foreground");
    expect(element.style.width).toBe("4em");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<OrbitDots />);
    await expectNoA11yViolations(container);
  });
});
