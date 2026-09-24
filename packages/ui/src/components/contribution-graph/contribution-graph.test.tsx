import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ContributionGraph, type ContributionDay } from "./contribution-graph";
import {
  ContributionGraphPanel,
  type ContributionGraphPanelItem,
  type ContributionGraphPanelProps,
} from "./contribution-graph-panel";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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

  // A year is 371 cells, and grid rules like aria-required-children judge the
  // grid as a whole, so axe must see all of it. That takes ~7s alone and far
  // longer while the full suite competes for the CPU — 30s timed out there.
  it("has no accessibility violations", async () => {
    const { container } = renderGraph();
    await expectNoA11yViolations(container);
  }, 120_000);
});

describe("ContributionGraph months and accent", () => {
  it("shows only the last N months of a finished year", () => {
    const { container } = renderGraph({ months: 3 });
    expect(container.querySelectorAll("[data-date]")).toHaveLength(92);
    expect(container.querySelector('[data-date="2025-10-01"]')).not.toBeNull();
    expect(container.querySelector('[data-date="2025-09-30"]')).toBeNull();
    const grid = screen.getByRole("grid", { name: "0 contributions in the last 3 months" });
    expect(within(grid).getByRole("columnheader", { name: "Oct" })).toBeInTheDocument();
    expect(within(grid).queryByRole("columnheader", { name: "Jan" })).toBeNull();
  });

  it("counts only the days inside the window, and names one month in the singular", () => {
    renderGraph({ months: 7 });
    expect(
      screen.getByRole("grid", { name: "2 contributions in the last 7 months" }),
    ).toBeInTheDocument();
    render(<ContributionGraph year={2025} months={1} />);
    expect(
      screen.getByRole("grid", { name: "0 contributions in the last 1 month" }),
    ).toBeInTheDocument();
  });

  it("ends the window today while the year is still running", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    const user = userEvent.setup();
    const { container } = render(<ContributionGraph months={2} />);
    expect(container.querySelectorAll("[data-date]")).toHaveLength(43);
    expect(container.querySelector('[data-date="2026-03-15"]')).not.toBeNull();
    expect(container.querySelector('[data-date="2026-03-16"]')).toBeNull();
    await user.tab();
    await user.keyboard("{Control>}{End}{/Control}");
    expect(cell("2026-03-15")).toHaveFocus();
  });

  it("shows the end of a year that has not started yet", () => {
    const { container } = render(<ContributionGraph year={2999} months={2} />);
    expect(container.querySelectorAll("[data-date]")).toHaveLength(61);
    expect(container.querySelector('[data-date="2999-12-31"]')).not.toBeNull();
  });

  it("tints the cells and the legend with an accent colour", () => {
    const ref = createRef<HTMLDivElement>();
    renderGraph({ accent: "var(--color-success)", ref, style: { padding: 4 } });
    expect(ref.current?.style.getPropertyValue("--contribution-graph-accent")).toBe(
      "var(--color-success)",
    );
    expect(ref.current?.style.padding).toBe("4px");
    const mark = cell("2025-01-02").querySelector("span");
    expect(mark).toHaveAttribute("data-accent");
    expect(mark).toHaveClass("data-[accent]:bg-[var(--contribution-graph-accent)]");
    const legend = document.querySelector('[data-slot="contribution-graph-legend"]');
    expect(legend?.querySelectorAll("[data-accent]")).toHaveLength(5);
  });

  it("adds no accent without one", () => {
    const ref = createRef<HTMLDivElement>();
    renderGraph({ ref });
    expect(ref.current?.getAttribute("style")).toBeNull();
    expect(document.querySelector("[data-accent]")).toBeNull();
  });
});

const PROJECTS: ContributionGraphPanelItem[] = [
  { name: "atlas", count: 12, href: "https://example.test/atlas" },
  { name: "beacon", count: 48, avatar: "https://img.test/beacon.png" },
  { name: "comet", count: 24 },
];

function renderPanel(
  panel: Partial<ContributionGraphPanelProps> = {},
  graph: Partial<Parameters<typeof ContributionGraph>[0]> = {},
) {
  return render(
    <ContributionGraph data={DATA} year={2025} months={1} locales="en-US" {...graph}>
      <ContributionGraphPanel items={PROJECTS} {...panel} />
    </ContributionGraph>,
  );
}

function sheetOf(toggle: HTMLElement) {
  const sheet = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
  if (!sheet) throw new Error("no sheet");
  return sheet;
}

describe("ContributionGraphPanel", () => {
  it("renders a collapsed footer: avatar stack, label and a disclosure button", () => {
    renderPanel();
    const toggle = screen.getByRole("button", { name: "Top projects" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(sheetOf(toggle)).toHaveAttribute("inert");
    expect(sheetOf(toggle)).toHaveAttribute("data-slot", "contribution-graph-panel-sheet");
    const footer = document.querySelector('[data-slot="contribution-graph-panel-footer"]');
    const stack = footer?.querySelector('[aria-hidden="true"]');
    expect(stack).toHaveTextContent("BCA");
    expect(screen.getByRole("grid").closest("[inert]")).toBeNull();
  });

  it("opens over the grid with ranked rows, and makes the grid inert", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderPanel({ onOpenChange });
    const toggle = screen.getByRole("button", { name: "Top projects" });
    await user.click(toggle);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(sheetOf(toggle)).not.toHaveAttribute("inert");
    expect(toggle.closest('[data-slot="contribution-graph-panel"]')).toHaveAttribute(
      "data-state",
      "open",
    );

    const list = screen.getByRole("list", { name: "Top projects" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Bbeacon4848 contributions",
      "Ccomet2424 contributions",
      "Aatlas1212 contributions",
    ]);
    expect(screen.getByRole("link", { name: "atlas" })).toHaveAttribute(
      "href",
      "https://example.test/atlas",
    );
    expect(rows.map((row) => row.style.getPropertyValue("--contribution-graph-ratio"))).toEqual(
      ["1", "0.5", "0.25"],
    );
    expect(screen.getByRole("grid").closest("[inert]")).not.toBeNull();
    expect(document.querySelector('[data-slot="contribution-graph-legend"]')).toHaveAttribute(
      "inert",
    );

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("grid").closest("[inert]")).toBeNull();
  });

  it("toggles from the keyboard, and Escape closes it and refocuses the chevron", async () => {
    const user = userEvent.setup();
    renderPanel();
    const toggle = screen.getByRole("button", { name: "Top projects" });
    toggle.focus();
    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    screen.getByRole("link", { name: "atlas" }).focus();
    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("leaves Escape alone once something else has handled it", async () => {
    const user = userEvent.setup();
    renderPanel({ defaultOpen: true });
    const link = screen.getByRole("link", { name: "atlas" });
    link.addEventListener("keydown", (event) => {
      event.preventDefault();
    });
    link.focus();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Top projects" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("starts open with defaultOpen", () => {
    renderPanel({ defaultOpen: true });
    expect(screen.getByRole("button", { name: "Top projects" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("grid").closest("[inert]")).not.toBeNull();
  });

  it("follows the controlled prop and only requests changes", async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <ContributionGraph year={2025} months={1}>
          <ContributionGraphPanel items={PROJECTS} open={open} onOpenChange={setOpen} />
        </ContributionGraph>
      );
    }
    const user = userEvent.setup();
    const { unmount } = render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Top projects" }));
    expect(screen.getByRole("button", { name: "Top projects" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    unmount();

    const onOpenChange = vi.fn();
    renderPanel({ open: false, onOpenChange });
    await user.click(screen.getByRole("button", { name: "Top projects" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "Top projects" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("uses the graph's count phrase unless given its own", () => {
    const { unmount } = renderPanel(
      { defaultOpen: true },
      { formatCount: (count) => `${String(count)} commits` },
    );
    expect(screen.getByText("48 commits")).toBeInTheDocument();
    unmount();
    renderPanel({ defaultOpen: true, formatCount: (count) => `${String(count)} pushes` });
    expect(screen.getByText("48 pushes")).toBeInTheDocument();
  });

  it("takes a custom label and stack size", () => {
    const { unmount } = renderPanel({ label: "Busiest repositories", stack: 1 });
    expect(screen.getByRole("button", { name: "Busiest repositories" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Busiest repositories" })).toBeInTheDocument();
    const footer = document.querySelector('[data-slot="contribution-graph-panel-footer"]');
    expect(footer?.querySelector('[aria-hidden="true"]')).toHaveTextContent(/^B$/);
    unmount();
    renderPanel({ stack: 0 });
    const bare = document.querySelector('[data-slot="contribution-graph-panel-footer"]');
    expect(bare?.querySelector('[aria-hidden="true"]:not(svg)')).toBeNull();
  });

  it("gives every bar no length when nothing has a count", () => {
    renderPanel({ items: [{ name: "idle", count: 0 }] });
    const row = document.querySelector<HTMLElement>(
      '[data-slot="contribution-graph-panel-row"]',
    );
    expect(row?.style.getPropertyValue("--contribution-graph-ratio")).toBe("0");
  });

  it("releases the grid when an open panel goes away", () => {
    const { rerender } = renderPanel({ defaultOpen: true });
    expect(screen.getByRole("grid").closest("[inert]")).not.toBeNull();
    rerender(<ContributionGraph data={DATA} year={2025} months={1} />);
    expect(screen.getByRole("grid").closest("[inert]")).toBeNull();
  });

  it("covers the graph down to the footer's measured top", () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(200);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      return this.getAttribute("data-slot") === "contribution-graph-panel-footer"
        ? new DOMRect(0, 170, 300, 30)
        : new DOMRect(0, 10, 300, 200);
    });
    renderPanel();
    const sheet = sheetOf(screen.getByRole("button", { name: "Top projects" }));
    expect(sheet.style.bottom).toBe("40px");
  });

  it("works outside a graph with the default count phrase", () => {
    render(<ContributionGraphPanel items={PROJECTS} defaultOpen />);
    expect(screen.getByText("48 contributions")).toBeInTheDocument();
  });

  it("forwards ref, className and props", () => {
    const ref = createRef<HTMLDivElement>();
    renderPanel({ ref, className: "pt-4", id: "projects" });
    expect(ref.current).toHaveAttribute("data-slot", "contribution-graph-panel");
    expect(ref.current).toHaveClass("pt-4", "group/contribution-graph-panel");
    expect(ref.current).toHaveAttribute("id", "projects");
  });

  it("has no accessibility violations, closed or open", async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Top projects" }));
    await expectNoA11yViolations(container);
  }, 60_000);
});
