import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DashboardBlock, type DashboardEvent, type DashboardStat } from "./dashboard";

const STATS: DashboardStat[] = [
  {
    id: "mrr",
    label: "Monthly revenue",
    value: "$48,120",
    change: 12.4,
    comparison: "on last month",
  },
  { id: "churn", label: "Churn", value: "1.8%", change: 0.4, higherIsBetter: false },
  { id: "users", label: "Active users", value: "2,410", change: -3.1 },
  { id: "uptime", label: "Uptime", value: "99.98%" },
];

const EVENTS: DashboardEvent[] = [
  {
    id: "1",
    title: "Deployed to production",
    at: "2026-09-01T09:12:00Z",
    label: "12 minutes ago",
    tone: "success",
  },
  {
    id: "2",
    title: "Build failed",
    detail: "Type error in table.tsx",
    at: "2026-09-01T08:40:00Z",
    label: "44 minutes ago",
    tone: "destructive",
  },
];

describe("DashboardBlock", () => {
  it("renders each metric", () => {
    render(<DashboardBlock stats={STATS} />);
    expect(screen.getByText("$48,120")).toBeInTheDocument();
    expect(screen.getByText("Active users")).toBeInTheDocument();
  });

  it("puts the metrics in a named region", () => {
    render(<DashboardBlock stats={STATS} />);
    expect(screen.getByRole("region", { name: "Key metrics" })).toBeInTheDocument();
  });

  it("states each change in words, not by a coloured arrow", () => {
    render(<DashboardBlock stats={STATS} />);
    expect(screen.getByText(/up 12\.4%/)).toBeInTheDocument();
    expect(screen.getByText(/down 3\.1%/)).toBeInTheDocument();
  });

  it("knows a rise is not always good", () => {
    render(<DashboardBlock stats={STATS} />);

    // Churn rising is bad; revenue rising is good. Same sign, opposite meaning.
    const churn = screen.getByText(/up 0\.4%/);
    const revenue = screen.getByText(/up 12\.4%/);
    expect(churn).toHaveClass("text-destructive");
    expect(revenue).toHaveClass("text-success");
  });

  it("omits the change when there is nothing to compare to", () => {
    render(<DashboardBlock stats={[STATS[3]!]} />);
    expect(screen.queryByText(/up |down /)).not.toBeInTheDocument();
  });

  it("renders the activity feed as an ordered list", () => {
    render(<DashboardBlock stats={STATS} events={EVENTS} />);

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows placeholders while loading, with no numbers to misread", () => {
    render(<DashboardBlock stats={STATS} events={EVENTS} loading />);
    expect(screen.queryByText("$48,120")).not.toBeInTheDocument();
    expect(screen.queryByText(/up 12\.4%/)).not.toBeInTheDocument();
  });

  it("renders actions beside the heading", () => {
    render(<DashboardBlock stats={STATS} actions={<button type="button">Export</button>} />);
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<DashboardBlock stats={STATS} events={EVENTS} />);
    await expectNoA11yViolations(container);
  });
});
