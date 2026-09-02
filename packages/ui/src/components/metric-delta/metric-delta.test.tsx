import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { MetricDelta } from "./metric-delta";

function root(container: HTMLElement): HTMLElement {
  return container.querySelector("[data-slot='metric-delta']") as HTMLElement;
}

describe("MetricDelta", () => {
  it("shows the value and the label", () => {
    const { container } = render(<MetricDelta label="Revenue" value={4210} />);

    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(container.textContent).toContain("4,210");
  });

  describe("polarity", () => {
    it("treats a rise as good when higher is better", () => {
      const { container } = render(
        <MetricDelta label="Revenue" value={110} previous={100} polarity="higher-is-better" />,
      );
      expect(root(container)).toHaveAttribute("data-sentiment", "good");
    });

    it("treats a rise as bad when lower is better", () => {
      // The bug this component exists to prevent: churn going up is not good
      // news, and painting it green is worse than showing no colour at all.
      const { container } = render(
        <MetricDelta label="Churn" value={110} previous={100} polarity="lower-is-better" />,
      );
      expect(root(container)).toHaveAttribute("data-sentiment", "bad");
    });

    it("treats a fall as good when lower is better", () => {
      const { container } = render(
        <MetricDelta label="Latency" value={90} previous={100} polarity="lower-is-better" />,
      );
      expect(root(container)).toHaveAttribute("data-sentiment", "good");
    });

    it("takes no view when polarity is neutral", () => {
      const { container } = render(
        <MetricDelta label="Headcount" value={110} previous={100} polarity="neutral" />,
      );
      expect(root(container)).toHaveAttribute("data-sentiment", "neutral");
      expect(root(container)).toHaveAttribute("data-direction", "up");
    });
  });

  describe("zero baseline", () => {
    it("does not report an infinite or NaN percentage", () => {
      const { container } = render(<MetricDelta label="Signups" value={25} previous={0} />);

      expect(container.textContent).not.toMatch(/Infinity|NaN|∞/);
    });

    it("says in words that no percentage is available", () => {
      render(<MetricDelta label="Signups" value={25} previous={0} />);

      expect(
        screen.getByText(/no percentage available from a zero baseline/),
      ).toBeInTheDocument();
    });

    it("still reports the absolute change", () => {
      const { container } = render(<MetricDelta label="Signups" value={25} previous={0} />);
      expect(container.textContent).toContain("+25");
    });
  });

  describe("meaningfulness", () => {
    it("drops sentiment for a change below the threshold", () => {
      const { container } = render(
        <MetricDelta label="Revenue" value={101} previous={100} insignificantBelow={0.05} />,
      );

      expect(root(container)).toHaveAttribute("data-sentiment", "neutral");
      expect(root(container)).toHaveAttribute("data-direction", "up");
    });

    it("says so rather than leaving the reader to infer it", () => {
      render(
        <MetricDelta label="Revenue" value={101} previous={100} insignificantBelow={0.05} />,
      );
      expect(screen.getByText(/not a meaningful change/)).toBeInTheDocument();
    });

    it("keeps sentiment for a change at or above the threshold", () => {
      const { container } = render(
        <MetricDelta label="Revenue" value={106} previous={100} insignificantBelow={0.05} />,
      );
      expect(root(container)).toHaveAttribute("data-sentiment", "good");
    });

    it("does not claim significance from the sample size", () => {
      // sampleSize is reported, never used to decide. A component holding two
      // numbers cannot run a significance test and must not imply it has.
      const { container } = render(
        <MetricDelta label="Conversion" value={106} previous={100} sampleSize={3} />,
      );
      expect(root(container)).toHaveAttribute("data-sentiment", "good");
      expect(screen.getByText(/sample size 3/)).toBeInTheDocument();
    });
  });

  describe("accessible description", () => {
    it("states the direction in text, not only in colour and an arrow", () => {
      render(<MetricDelta label="Revenue" value={110} previous={100} />);

      // WCAG 1.4.1: colour cannot be the only carrier of meaning.
      expect(screen.getByText(/up \+10%/)).toBeInTheDocument();
    });

    it("reads as one sentence rather than as separate fragments", () => {
      const { container } = render(
        <MetricDelta
          label="Revenue"
          value={110}
          previous={100}
          comparisonLabel="vs last week"
        />,
      );

      const description = container.querySelector(".sr-only");
      expect(description?.textContent).toBe("Revenue: 110, up +10% vs last week");
    });

    it("hides the visual value and delta from assistive technology", () => {
      const { container } = render(<MetricDelta label="Revenue" value={110} previous={100} />);

      const change = container.querySelector("[data-slot='metric-delta-change']");
      expect(change?.closest("[aria-hidden='true']")).not.toBeNull();
    });

    it("omits the comparison entirely when there is nothing to compare", () => {
      const { container } = render(<MetricDelta label="Revenue" value={110} />);

      expect(
        container.querySelector("[data-slot='metric-delta-change']"),
      ).not.toBeInTheDocument();
      expect(root(container)).toHaveAttribute("data-direction", "flat");
    });
  });

  it("reports an unchanged value as flat, not as a rise", () => {
    const { container } = render(<MetricDelta label="Revenue" value={100} previous={100} />);

    expect(root(container)).toHaveAttribute("data-direction", "flat");
    expect(root(container)).toHaveAttribute("data-sentiment", "neutral");
    expect(screen.getByText(/unchanged/)).toBeInTheDocument();
  });

  it("uses the supplied formatter for every number it shows", () => {
    const { container } = render(
      <MetricDelta
        label="Revenue"
        value={4210}
        previous={3980}
        format={(v) => `$${String(v)}`}
      />,
    );

    expect(container.textContent).toContain("$4210");
  });

  it("handles a negative previous value without inverting the direction", () => {
    const { container } = render(<MetricDelta label="Margin" value={-5} previous={-10} />);

    // -10 → -5 is a rise. Dividing by the signed previous would flip the sign.
    expect(root(container)).toHaveAttribute("data-direction", "up");
    expect(screen.getByText(/up \+50%/)).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <MetricDelta
        label="Revenue"
        value={4210}
        previous={3980}
        comparisonLabel="vs last month"
      />,
    );
    await expectNoA11yViolations(container);
  });
});
