import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { WaveBars } from "./wave-bars";

function root(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="wave-bars"]');
}

describe("WaveBars", () => {
  it("is hidden decoration without a label", () => {
    const { container } = render(<WaveBars />);
    expect(root(container)).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("is a named status with a label", () => {
    render(<WaveBars label="Listening" />);
    expect(screen.getByRole("status")).toHaveTextContent("Listening");
  });

  it("renders the number of bars asked for", () => {
    const { container } = render(<WaveBars bars={7} />);
    expect(container.querySelectorAll("[data-part=bar]")).toHaveLength(7);
  });

  it("settles when inactive", () => {
    const { container, rerender } = render(<WaveBars />);
    expect(root(container)).toHaveAttribute("data-state", "active");
    rerender(<WaveBars active={false} />);
    expect(root(container)).toHaveAttribute("data-state", "idle");
  });

  it("is an indicator on the indicator motion scale", () => {
    const { container } = render(<WaveBars />);
    expect(root(container)).toHaveAttribute("data-motion", "indicator");
    const bar = container.querySelector<HTMLElement>("[data-part=bar]");
    expect(bar?.style.getPropertyValue("--delay")).toContain("--motion-scale-indicator");
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(<WaveBars ref={ref} label="Listening" className="text-primary" />);
    expect(ref.current).toBe(screen.getByRole("status"));
    expect(ref.current).toHaveClass("text-primary", "inline-flex");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<WaveBars label="Listening" />);
    await expectNoA11yViolations(container);
  });
});
