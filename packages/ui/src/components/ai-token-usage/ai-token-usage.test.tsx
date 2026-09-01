import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TokenCount, TokenUsage } from "./ai-token-usage";

describe("TokenUsage", () => {
  it("shows the numbers, which are the actual content", () => {
    render(<TokenUsage used={12000} limit={200000} />);
    expect(screen.getByText("12,000 / 200,000")).toBeInTheDocument();
  });

  it("labels what is being measured", () => {
    render(<TokenUsage used={100} limit={1000} />);
    expect(screen.getByText("Context used")).toBeInTheDocument();
  });

  it("accepts a custom label and formatter", () => {
    render(
      <TokenUsage
        used={1500}
        limit={4000}
        label="Budget"
        format={(value) => `${String(Math.round(value / 1000))}k`}
      />,
    );
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("2k / 4k")).toBeInTheDocument();
  });

  it("hides the bar, since it only restates the numbers", () => {
    const { container } = render(<TokenUsage used={100} limit={1000} />);
    // Not a second progressbar to read past.
    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("marks the warning state past the threshold", () => {
    const { container } = render(<TokenUsage used={900} limit={1000} />);
    expect(container.firstElementChild).toHaveAttribute("data-warning", "true");
  });

  it("does not warn below the threshold", () => {
    const { container } = render(<TokenUsage used={100} limit={1000} />);
    expect(container.firstElementChild).not.toHaveAttribute("data-warning");
  });

  it("marks going over the limit", () => {
    const { container } = render(<TokenUsage used={1200} limit={1000} />);
    expect(container.firstElementChild).toHaveAttribute("data-over", "true");
    // The figures stay readable even when over.
    expect(screen.getByText("1,200 / 1,000")).toBeInTheDocument();
  });

  it("clamps the bar rather than overflowing it", () => {
    const { container } = render(<TokenUsage used={5000} limit={1000} />);
    const fill = container.querySelector("[aria-hidden='true'] > div");
    expect(fill).toHaveStyle({ width: "100%" });
  });

  it("survives a zero limit without dividing by it", () => {
    const { container } = render(<TokenUsage used={10} limit={0} />);
    const fill = container.querySelector("[aria-hidden='true'] > div");
    expect(fill).toHaveStyle({ width: "0%" });
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<TokenUsage used={180000} limit={200000} />);
    await expectNoA11yViolations(container);
  });
});

describe("TokenCount", () => {
  it("formats the count", () => {
    render(<TokenCount value={12345} />);
    expect(screen.getByText("12,345 tokens")).toBeInTheDocument();
  });

  it("accepts a custom unit", () => {
    render(<TokenCount value={42} label="output tokens" />);
    expect(screen.getByText("42 output tokens")).toBeInTheDocument();
  });
});
