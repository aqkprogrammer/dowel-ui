import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CrmBlock, type CrmActivity, type CrmDeal, type CrmStage } from "./crm";

const STAGES: CrmStage[] = [
  { id: "qualified", label: "Qualified", count: 2, value: 48_000 },
  { id: "proposal", label: "Proposal", count: 1, value: 120_000 },
  { id: "negotiation", label: "Negotiation", count: 1, value: 64_000 },
];

const DEALS: CrmDeal[] = [
  {
    id: "d1",
    company: "Acme Corp",
    contact: "Dana Whitfield",
    stage: "proposal",
    value: 120_000,
    owner: "Priya Nair",
    closeAt: "2026-03-14",
    closeLabel: "14 Mar",
    href: "/deals/d1",
  },
  {
    id: "d2",
    company: "Northwind",
    stage: "qualified",
    value: 30_000,
    owner: "Sam Okafor",
  },
  {
    id: "d3",
    company: "Globex",
    contact: "Lee Tanaka",
    stage: "negotiation",
    value: 64_000,
    owner: "Priya Nair",
  },
  {
    id: "d4",
    company: "Initech",
    stage: "qualified",
    value: 18_000,
    owner: "Sam Okafor",
  },
];

const ACTIVITY: CrmActivity[] = [
  {
    id: "a1",
    title: "Called Dana Whitfield",
    detail: "Pricing questions; sending revised proposal.",
    at: "2026-03-04T09:14:00Z",
    label: "2 hours ago",
    kind: "call",
  },
  { id: "a2", title: "Emailed Northwind", at: "2026-03-03T16:00:00Z", label: "yesterday" },
];

const BASE = {
  pipelineValue: 232_000,
  wonValue: 86_000,
  stages: STAGES,
  deals: DEALS,
};

/** The metric whose label this is, as rendered. */
function metric(container: HTMLElement, label: string): HTMLElement {
  const found = [...container.querySelectorAll<HTMLElement>('[data-slot="metric-delta"]')].find(
    (element) => element.textContent?.includes(label),
  );
  if (!found) throw new Error(`No metric labelled "${label}"`);
  return found;
}

describe("CrmBlock", () => {
  it("shows the headline figures", () => {
    render(<CrmBlock {...BASE} />);
    expect(screen.getByText("Open pipeline")).toBeInTheDocument();
    expect(screen.getByText("Closed won")).toBeInTheDocument();
  });

  it("treats a longer sales cycle as bad news", () => {
    const { container } = render(<CrmBlock {...BASE} cycleDays={41} previousCycleDays={28} />);

    expect(metric(container, "Sales cycle")).toHaveAttribute("data-direction", "up");
    expect(metric(container, "Sales cycle")).toHaveAttribute("data-sentiment", "bad");
    expect(screen.getByText("41 days")).toBeInTheDocument();
  });

  it("treats a rising win rate as good news", () => {
    const { container } = render(<CrmBlock {...BASE} winRate={0.34} previousWinRate={0.28} />);
    expect(metric(container, "Win rate")).toHaveAttribute("data-sentiment", "good");
    expect(screen.getByText("34%")).toBeInTheDocument();
  });

  it("shows a dash rather than a fabricated figure when a rate is unknown", () => {
    render(<CrmBlock {...BASE} />);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("formats every amount with the formatter it is given", () => {
    render(<CrmBlock {...BASE} formatMoney={(value) => `€${String(value / 1000)}k`} />);
    expect(screen.getByText("€232k")).toBeInTheDocument();
    // The meter legend and the deal table both use it.
    expect(screen.getAllByText("€120k").length).toBeGreaterThanOrEqual(2);
  });

  it("announces the pipeline total as money, and names every stage in the legend", () => {
    render(<CrmBlock {...BASE} />);

    const meter = screen.getByRole("meter", { name: "Open pipeline by stage" });
    expect(meter).toHaveAttribute("aria-valuetext", "$232,000 of $232,000");

    const legend = document.querySelector('[data-slot="meter-legend"]') as HTMLElement;
    expect(within(legend).getByText("Qualified")).toBeInTheDocument();
    expect(within(legend).getByText("Negotiation")).toBeInTheDocument();
  });

  it("lists the deal count per stage in words", () => {
    render(<CrmBlock {...BASE} />);
    expect(screen.getByText(/2 deals/)).toBeInTheDocument();
    expect(screen.getAllByText(/1 deal ·/).length).toBe(2);
  });

  it("filters deals by text and announces how many match", async () => {
    const user = userEvent.setup();
    render(<CrmBlock {...BASE} />);

    await user.type(screen.getByLabelText("Filter by company, contact or owner"), "acme");

    const table = screen.getByRole("table", { name: "Open deals" });
    expect(within(table).getByText("Acme Corp")).toBeInTheDocument();
    expect(within(table).queryByText("Globex")).not.toBeInTheDocument();
    expect(screen.getByText("1 deal matches the filter.")).toBeInTheDocument();
  });

  it("filters deals by stage", async () => {
    const user = userEvent.setup();
    render(<CrmBlock {...BASE} />);

    await user.click(screen.getByRole("combobox", { name: "Stage" }));
    await user.click(screen.getByRole("option", { name: "Qualified" }));

    const table = screen.getByRole("table", { name: "Open deals" });
    expect(within(table).getByText("Northwind")).toBeInTheDocument();
    expect(within(table).getByText("Initech")).toBeInTheDocument();
    expect(within(table).queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("explains an empty result rather than showing an empty table", async () => {
    const user = userEvent.setup();
    render(<CrmBlock {...BASE} />);

    await user.type(screen.getByLabelText("Filter by company, contact or owner"), "zzz");
    expect(screen.getByText("No deals match")).toBeInTheDocument();
  });

  it("names each Open button after its deal", async () => {
    const user = userEvent.setup();
    const onOpenDeal = vi.fn();
    render(<CrmBlock {...BASE} onOpenDeal={onOpenDeal} />);

    await user.click(screen.getByRole("button", { name: "Open Globex" }));
    expect(onOpenDeal).toHaveBeenCalledWith(expect.objectContaining({ id: "d3" }));
  });

  it("links to a deal's page when there is no handler", () => {
    render(<CrmBlock {...BASE} />);
    expect(screen.getByRole("link", { name: "Open Acme Corp" })).toHaveAttribute(
      "href",
      "/deals/d1",
    );
    // A deal with neither a handler nor a page gets no dead button.
    expect(screen.queryByRole("button", { name: "Open Northwind" })).not.toBeInTheDocument();
  });

  it("offers a new deal only when something handles it", () => {
    const { rerender } = render(<CrmBlock {...BASE} />);
    expect(screen.queryByRole("button", { name: "New deal" })).not.toBeInTheDocument();

    rerender(<CrmBlock {...BASE} onNewDeal={() => undefined} />);
    expect(screen.getByRole("button", { name: "New deal" })).toBeInTheDocument();
  });

  it("shows recent activity with the kind as text", () => {
    render(<CrmBlock {...BASE} activity={ACTIVITY} />);
    expect(screen.getByText("Called Dana Whitfield")).toBeInTheDocument();
    expect(screen.getByText("call")).toBeInTheDocument();
  });

  it("explains an empty activity feed", () => {
    render(<CrmBlock {...BASE} />);
    expect(screen.getByText("Nothing logged yet")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <CrmBlock
        {...BASE}
        previousPipelineValue={198_000}
        previousWonValue={91_000}
        winRate={0.34}
        previousWinRate={0.28}
        cycleDays={41}
        previousCycleDays={28}
        activity={ACTIVITY}
        onNewDeal={() => undefined}
        onOpenDeal={() => undefined}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
