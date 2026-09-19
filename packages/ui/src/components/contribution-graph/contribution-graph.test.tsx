import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ContributionGraph, type ContributionDay } from "./contribution-graph";

const DATA: ContributionDay[] = [
  { date: "2025-01-01", count: 1 },
  { date: "2025-01-02", count: 8 },
  { date: "2025-03-10", count: 4 },
  { date: "2025-06-15", count: 2, level: 4 },
  { date: "2024-12-31", count: 50 },
];

function cell(date: string) {
  const found = document.querySelector<HTMLElement>(`[data-date="${date}"]`);
  if (!found) throw new Error(`no cell ${date}`);
  return found;
}

function renderGraph(props: Partial<Parameters<typeof ContributionGraph>[0]> = {}) {
  return render(<ContributionGraph data={DATA} year={2025} locales="en-US" {...props} />);
}

describe("ContributionGraph", () => {
  it("renders a grid named by its total, with weekday rows and month headers", () => {
    renderGraph();
    const grid = screen.getByRole("grid", { name: "15 contributions in 2025" });
    expect(within(grid).getAllByRole("row")).toHaveLength(8);
    expect(within(grid).getByRole("rowheader", { name: /Sunday/ })).toBeInTheDocument();
    expect(within(grid).getByRole("columnheader", { name: "Jan" })).toBeInTheDocument();
    expect(within(grid).getByRole("columnheader", { name: "Dec" })).toBeInTheDocument();
  });

  it("renders every day of the year, and only that year", () => {
    const { container } = renderGraph();
    expect(container.querySelectorAll("[data-date]")).toHaveLength(365);
    expect(container.querySelector('[data-date="2024-12-31"]')).toBeNull();
    const leap = render(<ContributionGraph year={2024} />);
    expect(leap.container.querySelectorAll("[data-date]")).toHaveLength(366);
  });

  it("labels each day with its count and full date", () => {
    renderGraph();
    expect(
      screen.getByRole("gridcell", { name: "8 contributions, Thursday, January 2, 2025" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", { name: "1 contribution, Wednesday, January 1, 2025" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", { name: "No contributions, Friday, January 3, 2025" }),
    ).toBeInTheDocument();
  });

  it("derives levels from the busiest day, honouring explicit levels", () => {
    renderGraph();
    expect(cell("2025-01-02")).toHaveAttribute("data-level", "4");
    expect(cell("2025-03-10")).toHaveAttribute("data-level", "2");
    expect(cell("2025-01-01")).toHaveAttribute("data-level", "1");
    expect(cell("2025-06-15")).toHaveAttribute("data-level", "4");
    expect(cell("2025-01-03")).toHaveAttribute("data-level", "0");
    expect(cell("2025-01-02").querySelector("span")).toHaveClass("bg-primary");
  });

  it("accepts a custom level function and count text", () => {
    renderGraph({
      getLevel: (count) => (count > 3 ? 3 : 1),
      formatCount: (n) => `${String(n)} commits`,
    });
    expect(cell("2025-01-02")).toHaveAttribute("data-level", "3");
    expect(screen.getByRole("gridcell", { name: /^8 commits/ })).toBeInTheDocument();
  });

  it("has one tab stop and moves by day and week with the arrow keys", async () => {
    const user = userEvent.setup();
    renderGraph();
    expect(document.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    await user.tab();
    expect(cell("2025-01-01")).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(cell("2025-01-02")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(cell("2025-01-09")).toHaveFocus();
    await user.keyboard("{ArrowLeft}{ArrowUp}");
    expect(cell("2025-01-01")).toHaveFocus();
    expect(cell("2025-01-01")).toHaveAttribute("tabindex", "0");
    expect(cell("2025-01-02")).toHaveAttribute("tabindex", "-1");

    // The edges of the year stop movement.
    await user.keyboard("{ArrowUp}{ArrowLeft}");
    expect(cell("2025-01-01")).toHaveFocus();
  });

  it("jumps with Home, End, Ctrl+Home, Ctrl+End, PageUp and PageDown", async () => {
    const user = userEvent.setup();
    renderGraph();
    await user.tab();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(cell("2025-01-15")).toHaveFocus();
    await user.keyboard("{End}");
    expect(cell("2025-12-31")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(cell("2025-01-01")).toHaveFocus();
    await user.keyboard("{ArrowDown}{Home}");
    expect(cell("2025-01-02")).toHaveFocus();
    await user.keyboard("{End}");
    expect(cell("2025-12-25")).toHaveFocus();
    await user.keyboard("{Control>}{Home}{/Control}");
    expect(cell("2025-01-01")).toHaveFocus();
    await user.keyboard("{PageDown}");
    expect(cell("2025-01-29")).toHaveFocus();
    await user.keyboard("{PageUp}{PageUp}");
    expect(cell("2025-01-01")).toHaveFocus();
    await user.keyboard("{Control>}{End}{/Control}{PageDown}");
    expect(cell("2025-12-31")).toHaveFocus();
    await user.keyboard("a");
    expect(cell("2025-12-31")).toHaveFocus();
  });

  it("mirrors the week keys in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <ContributionGraph data={DATA} year={2025} locales="en-US" />
      </div>,
    );
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(cell("2025-01-08")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(cell("2025-01-01")).toHaveFocus();
  });

  it("shows the tooltip for the focused day, follows focus, and dismisses on Escape", async () => {
    const user = userEvent.setup();
    renderGraph();
    expect(screen.queryByRole("tooltip")).toBeNull();
    await user.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "1 contributionWednesday, January 1, 2025",
    );
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("tooltip")).toHaveTextContent("8 contributions");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).toBeNull();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("tooltip")).toHaveTextContent("No contributions");
    await user.tab();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows the tooltip for the hovered day and hides it when the pointer leaves", async () => {
    const user = userEvent.setup();
    renderGraph();
    await user.hover(cell("2025-03-10"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("4 contributions");
    await user.unhover(screen.getByRole("grid"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("can hide tooltips and the legend", async () => {
    const user = userEvent.setup();
    renderGraph({ showTooltips: false, showLegend: false });
    await user.tab();
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(screen.queryByText("Less")).toBeNull();
  });

  it("renders a legend with custom labels and a custom grid name", () => {
    renderGraph({ lessLabel: "Fewer", moreLabel: "Most", label: "Activity" });
    expect(screen.getByText("Fewer")).toBeInTheDocument();
    expect(screen.getByText("Most")).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "Activity" })).toBeInTheDocument();
  });

  it("names a single contribution in the singular", () => {
    render(<ContributionGraph year={2025} data={[{ date: "2025-05-05", count: 1 }]} />);
    expect(screen.getByRole("grid", { name: "1 contribution in 2025" })).toBeInTheDocument();
  });

  it("defaults to the current year", () => {
    render(<ContributionGraph />);
    expect(
      screen.getByRole("grid", {
        name: `0 contributions in ${String(new Date().getUTCFullYear())}`,
      }),
    ).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards a ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ContributionGraph ref={ref} year={2025} className="gap-6" />);
    expect(ref.current).toHaveClass("gap-6");
    expect(ref.current).not.toHaveClass("gap-3");
  });

  it("has no accessibility violations", async () => {
    const { container } = renderGraph();
    await expectNoA11yViolations(container);
  }, 30_000);
});
