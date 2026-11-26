import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { BreathRings } from "./breath-rings";

function root(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="breath-rings"]');
}

describe("BreathRings", () => {
  it("keeps the artwork out of the accessibility tree and stays quiet without a label", () => {
    const { container } = render(<BreathRings />);
    expect(root(container)?.querySelector('[data-part="dot"]')?.parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces its label through a status region", () => {
    render(<BreathRings label="Listening" />);
    expect(screen.getByRole("status")).toHaveTextContent("Listening");
  });

  it("draws a dot and two rings", () => {
    const { container } = render(<BreathRings />);
    for (const part of ["dot", "inner", "outer"]) {
      expect(container.querySelector(`[data-part="${part}"]`)).toBeInTheDocument();
    }
  });

  it("is decorative, so it does not opt out of reduced motion", () => {
    const { container } = render(<BreathRings />);
    expect(root(container)).not.toHaveAttribute("data-motion");
  });

  it("scales its period through the motion scale", () => {
    const { container } = render(<BreathRings period={3} />);
    expect(root(container)?.style.getPropertyValue("--dowel-breath-rings-period")).toBe(
      "calc(3s * var(--motion-scale, 1))",
    );
  });

  it("applies sizes and merges className", () => {
    const { container } = render(<BreathRings size="lg" className="text-primary" />);
    expect(root(container)).toHaveClass("text-2xl", "text-primary");
  });

  it("forwards its ref", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(<BreathRings ref={ref} />);
    expect(ref.current).toBe(root(container));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<BreathRings label="Listening" />);
    await expectNoA11yViolations(container);
  });
});
