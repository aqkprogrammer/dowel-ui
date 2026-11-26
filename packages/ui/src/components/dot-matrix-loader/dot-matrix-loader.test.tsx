import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DOT_MATRIX_LOADER_PATTERNS, DotMatrixLoader } from "./dot-matrix-loader";

describe("DotMatrixLoader", () => {
  it("is one status region announcing its label", () => {
    render(<DotMatrixLoader label="Thinking" />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Thinking");
  });

  it("falls back to srLabel when the label is empty", () => {
    render(<DotMatrixLoader label="" srLabel="Working" />);
    expect(screen.getByRole("status")).toHaveTextContent("Working");
  });

  it.each(DOT_MATRIX_LOADER_PATTERNS)("renders %s with a hidden matrix", (pattern) => {
    const { container } = render(<DotMatrixLoader pattern={pattern} />);
    expect(container.querySelector('[data-part="matrix"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByRole("status")).toHaveAttribute("data-pattern", pattern);
    // An indicator: exempt from the reduced-motion freeze, slowed instead.
    expect(screen.getByRole("status")).toHaveAttribute("data-motion", "indicator");
  });

  it("uses the pattern's own tone unless one is given", () => {
    const { rerender } = render(<DotMatrixLoader pattern="orbit" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "amber");
    rerender(<DotMatrixLoader pattern="orbit" tone="rose" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "rose");
  });

  it("can drop the shimmer", () => {
    const { container } = render(<DotMatrixLoader shimmer={false} />);
    expect(container.querySelector('[data-slot="shimmer-text"]')).toBeNull();
  });

  it("merges className and forwards ref and props", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<DotMatrixLoader ref={ref} className="mt-2" data-testid="l" />);
    expect(ref.current).toBe(screen.getByRole("status"));
    expect(screen.getByTestId("l")).toHaveClass("mt-2");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<DotMatrixLoader />);
    await expectNoA11yViolations(container);
  });
});
