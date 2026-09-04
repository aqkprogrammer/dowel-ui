import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  AnalyticsBlock,
  describeSeries,
  type AnalyticsBreakdownRow,
  type AnalyticsMetric,
  type AnalyticsPoint,
} from "./analytics";

const SERIES: AnalyticsPoint[] = [
  { at: "2026-03-01", label: "Mon", value: 1200 },
  { at: "2026-03-02", label: "Tue", value: 1840 },
  { at: "2026-03-03", label: "Wed", value: 900 },
  { at: "2026-03-04", label: "Thu", value: 1610 },
];

const METRICS: AnalyticsMetric[] = [
  { id: "visitors", label: "Visitors", value: 5550, previous: 4980 },
  { id: "bounce", label: "Bounce rate", value: 38, previous: 44, polarity: "lower-is-better" },
];

const BREAKDOWN: AnalyticsBreakdownRow[] = [
  { id: "search", label: "Search", value: 60 },
  { id: "direct", label: "Direct", value: 30 },
  { id: "social", label: "Social", value: 10 },
];

describe("describeSeries", () => {
  it("summarises the shape rather than listing every point", () => {
    const summary = describeSeries(SERIES, "Visitors");

    expect(summary).toContain("4 points from Mon to Thu");
    expect(summary).toContain("rising from 1,200 to 1,610");
    expect(summary).toContain("Highest 1,840 at Tue");
    expect(summary).toContain("lowest 900 at Wed");
  });

  it("says it fell when it fell", () => {
    expect(describeSeries([...SERIES].reverse(), "Visitors")).toContain("falling from 1,610");
  });

  it("does not claim a direction when it ended where it started", () => {
    const flat: AnalyticsPoint[] = [
      { at: "1", label: "A", value: 10 },
      { at: "2", label: "B", value: 40 },
      { at: "3", label: "C", value: 10 },
    ];
    expect(describeSeries(flat, "Visitors")).toContain("ending where it started");
  });

  it("omits the extremes when there is only one point to describe", () => {
    const summary = describeSeries([{ at: "1", label: "A", value: 5 }], "Visitors");
    expect(summary).toContain("a single point at A");
    expect(summary).not.toContain("Highest");
  });

  it("says so rather than producing a broken sentence when empty", () => {
    expect(describeSeries([], "Visitors")).toBe("Visitors: no data.");
  });

  it("uses the caller's formatter", () => {
    const summary = describeSeries(SERIES, "Revenue", (value) => `$${String(value)}`);
    expect(summary).toContain("$1200");
  });
});

describe("AnalyticsBlock", () => {
  it("renders each metric", () => {
    render(<AnalyticsBlock metrics={METRICS} />);
    expect(screen.getByText("Visitors")).toBeInTheDocument();
    expect(screen.getByText("Bounce rate")).toBeInTheDocument();
  });

  it("declares the bars as one image with a summary, not forty labelled elements", () => {
    render(<AnalyticsBlock metrics={METRICS} series={SERIES} />);

    const chart = screen.getByRole("img");
    expect(chart.getAttribute("aria-label")).toContain("rising from 1,200 to 1,610");
  });

  it("keeps the data table collapsed until asked, for everyone", () => {
    render(<AnalyticsBlock metrics={METRICS} series={SERIES} />);

    // Not visually-hidden-but-exposed: genuinely hidden from everyone.
    expect(screen.queryByRole("table", { name: /for each point/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show data" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("reveals the exact numbers as a real table, from the keyboard", async () => {
    const user = userEvent.setup();
    render(<AnalyticsBlock metrics={METRICS} series={SERIES} />);

    const toggle = screen.getByRole("button", { name: "Show data" });
    toggle.focus();
    await user.keyboard("{Enter}");

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const table = screen.getByRole("table", { name: /for each point/ });
    expect(within(table).getByText("1,840")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide data" })).toBeInTheDocument();
  });

  it("points the toggle at the region it controls", () => {
    render(<AnalyticsBlock metrics={METRICS} series={SERIES} />);

    const toggle = screen.getByRole("button", { name: "Show data" });
    const id = toggle.getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).not.toBeNull();
  });

  it("gives every point a machine-readable date in the table", async () => {
    const user = userEvent.setup();
    render(<AnalyticsBlock metrics={METRICS} series={SERIES} />);
    await user.click(screen.getByRole("button", { name: "Show data" }));

    const monday = screen.getByText("Mon", { selector: "time" });
    expect(monday).toHaveAttribute("datetime", "2026-03-01");
  });

  it("draws no chart, and no toggle, with no series", () => {
    render(<AnalyticsBlock metrics={METRICS} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /data/ })).not.toBeInTheDocument();
  });

  it("survives a series that is all zeroes without dividing by zero", () => {
    const zeroes: AnalyticsPoint[] = [
      { at: "1", label: "A", value: 0 },
      { at: "2", label: "B", value: 0 },
    ];
    render(<AnalyticsBlock metrics={METRICS} series={zeroes} />);

    // Every bar keeps its floor rather than collapsing to nothing or NaN.
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("computes each share from the rows when none is given", () => {
    render(<AnalyticsBlock metrics={METRICS} breakdown={BREAKDOWN} />);
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
  });

  it("offers the range as a named select, not as tabs promising panels", () => {
    render(
      <AnalyticsBlock
        metrics={METRICS}
        ranges={[
          { id: "7d", label: "7 days" },
          { id: "30d", label: "30 days" },
        ]}
        range="7d"
      />,
    );

    expect(screen.getByRole("combobox", { name: "Date range" })).toBeInTheDocument();
    // Tabs here referred to tabpanels that do not exist, which axe fails.
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("changes range from the keyboard", async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    render(
      <AnalyticsBlock
        metrics={METRICS}
        ranges={[
          { id: "7d", label: "7 days" },
          { id: "30d", label: "30 days" },
        ]}
        range="7d"
        onRangeChange={onRangeChange}
      />,
    );

    screen.getByRole("combobox", { name: "Date range" }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onRangeChange).toHaveBeenCalledWith("30d");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AnalyticsBlock
        metrics={METRICS}
        series={SERIES}
        breakdown={BREAKDOWN}
        ranges={[{ id: "7d", label: "7 days" }]}
        range="7d"
      />,
    );
    await expectNoA11yViolations(container);
  });
});
