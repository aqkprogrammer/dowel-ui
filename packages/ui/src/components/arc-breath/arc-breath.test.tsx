import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ArcBreath } from "./arc-breath";

function root(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="arc-breath"]');
}

describe("ArcBreath", () => {
  it("announces Loading by default", () => {
    render(<ArcBreath />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("takes a custom label, or none", () => {
    const { rerender } = render(<ArcBreath label="Fetching" />);
    expect(screen.getByRole("status")).toHaveTextContent("Fetching");
    rerender(<ArcBreath label="" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("hides its artwork", () => {
    const { container } = render(<ArcBreath />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("is an indicator on the indicator motion scale", () => {
    const { container } = render(<ArcBreath period={1.5} />);
    expect(root(container)).toHaveAttribute("data-motion", "indicator");
    expect(root(container)?.style.getPropertyValue("--dowel-arc-breath-period")).toBe(
      "calc(1.5s * var(--motion-scale-indicator, 1))",
    );
  });

  it("applies sizes and merges className", () => {
    const { container } = render(<ArcBreath size="lg" className="text-primary" />);
    expect(root(container)).toHaveClass("size-20", "text-primary");
  });

  it("forwards its ref", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(<ArcBreath ref={ref} />);
    expect(ref.current).toBe(root(container));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ArcBreath />);
    await expectNoA11yViolations(container);
  });
});
