import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { BreathOrb } from "./breath-orb";

const root = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-slot=breath-orb]")!;

describe("BreathOrb", () => {
  it("is hidden from assistive tech by default", () => {
    const { container } = render(<BreathOrb />);
    expect(root(container)).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("becomes a named image with a label", () => {
    render(<BreathOrb label="Breathe with the orb" />);
    expect(screen.getByRole("img", { name: "Breathe with the orb" })).toBeInTheDocument();
  });

  it("scales its loop with the motion scale and can pause", () => {
    const { container, rerender } = render(<BreathOrb duration={4} />);
    expect(root(container).style.getPropertyValue("--dur")).toBe(
      "calc(4s * var(--motion-scale, 1))",
    );
    expect(root(container)).not.toHaveAttribute("data-paused");
    rerender(<BreathOrb paused />);
    expect(root(container)).toHaveAttribute("data-paused");
  });

  it("is decoration, not an indicator exempt from reduced motion", () => {
    const { container } = render(<BreathOrb />);
    expect(root(container)).not.toHaveAttribute("data-motion");
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(<BreathOrb ref={ref} className="custom" />);
    expect(ref.current).toBe(root(container));
    expect(ref.current).toHaveClass("custom", "inline-grid");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <BreathOrb />
        <BreathOrb label="Breathing" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
