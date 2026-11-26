import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PulseDots } from "./pulse-dots";

describe("PulseDots", () => {
  it("is a status named Typing by default", () => {
    render(<PulseDots />);
    expect(screen.getByRole("status")).toHaveTextContent("Typing");
  });

  it("takes a custom label", () => {
    render(<PulseDots label="Ana is typing" />);
    expect(screen.getByRole("status")).toHaveTextContent("Ana is typing");
  });

  it("renders three aria-hidden dots, or as many as asked", () => {
    const { container, rerender } = render(<PulseDots />);
    const dots = container.querySelectorAll("[data-part=dot]");
    expect(dots).toHaveLength(3);
    dots.forEach((dot) => expect(dot).toHaveAttribute("aria-hidden", "true"));
    rerender(<PulseDots count={5} />);
    expect(container.querySelectorAll("[data-part=dot]")).toHaveLength(5);
  });

  it("is an indicator whose stagger runs through the indicator motion scale", () => {
    const { container } = render(<PulseDots />);
    expect(screen.getByRole("status")).toHaveAttribute("data-motion", "indicator");
    const second = container.querySelectorAll<HTMLElement>("[data-part=dot]")[1];
    expect(second?.style.getPropertyValue("--delay")).toContain("--motion-scale-indicator");
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<PulseDots ref={ref} className="text-primary" />);
    expect(ref.current).toBe(screen.getByRole("status"));
    expect(ref.current).toHaveClass("text-primary", "inline-flex");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PulseDots />);
    await expectNoA11yViolations(container);
  });
});
