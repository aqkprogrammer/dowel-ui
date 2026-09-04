import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AiDashboardBlock, type AiModelUsage, type AiRunSummary } from "./ai-dashboard";

const MODELS: AiModelUsage[] = [
  { id: "opus", model: "claude-opus-5", runs: 120, tokens: 4_200_000, cost: "$182.40" },
  { id: "sonnet", model: "claude-sonnet-5", runs: 940, tokens: 8_100_000, cost: "$61.20" },
];

const RUNS: AiRunSummary[] = [
  {
    id: "r1",
    title: "Deduplicate contacts",
    state: "working",
    model: "claude-opus-5",
    tokens: 42_000,
    at: "2026-03-04T09:14:00Z",
    label: "4 minutes ago",
    href: "/runs/r1",
  },
  { id: "r2", title: "Summarise tickets", state: "done", model: "claude-sonnet-5" },
  { id: "r3", title: "Classify inbound", state: "error" },
];

const BASE = { tokens: 12_300_000, spend: "$243.60", runs: 1060 };

describe("AiDashboardBlock", () => {
  it("shows the headline figures", () => {
    render(<AiDashboardBlock {...BASE} />);
    expect(screen.getByText("Tokens")).toBeInTheDocument();
    expect(screen.getByText("$243.60")).toBeInTheDocument();
  });

  /** The metric whose label this is, as rendered. */
  function metric(container: HTMLElement, label: string): HTMLElement {
    const found = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="metric-delta"]'),
    ].find((element) => element.textContent?.includes(label));
    if (!found) throw new Error(`No metric labelled "${label}"`);
    return found;
  }

  it("treats a rising bill as bad news, not as growth", () => {
    const { container } = render(
      <AiDashboardBlock {...BASE} spendValue={243.6} previousSpendValue={180} />,
    );

    // The mistake this block exists to avoid: congratulating you on a bill.
    expect(metric(container, "Spend")).toHaveAttribute("data-direction", "up");
    expect(metric(container, "Spend")).toHaveAttribute("data-sentiment", "bad");
  });

  it("treats a rising failure rate as bad news too", () => {
    const { container } = render(
      <AiDashboardBlock {...BASE} failureRate={0.08} previousFailureRate={0.03} />,
    );

    expect(metric(container, "Failure rate")).toHaveAttribute("data-sentiment", "bad");
    expect(screen.getByText("8%")).toBeInTheDocument();
  });

  it("still treats more runs as neutral rather than as an achievement", () => {
    const { container } = render(<AiDashboardBlock {...BASE} runs={1060} previousRuns={890} />);
    expect(metric(container, "Runs")).toHaveAttribute("data-sentiment", "neutral");
  });

  it("shows a dash rather than a fabricated zero with no failure rate", () => {
    render(<AiDashboardBlock {...BASE} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders spend without a delta when there is nothing to compare to", () => {
    render(<AiDashboardBlock {...BASE} />);
    expect(screen.getByText("$243.60")).toBeInTheDocument();
  });

  it("totals the model table in a real footer, not a body row", () => {
    const { container } = render(<AiDashboardBlock {...BASE} models={MODELS} />);

    const footer = container.querySelector("tfoot");
    expect(footer).not.toBeNull();
    expect(within(footer as HTMLElement).getByText("Total")).toBeInTheDocument();

    // "Total" must not be announced as another model.
    const body = container.querySelector("tbody");
    expect(within(body as HTMLElement).queryByText("Total")).not.toBeInTheDocument();
  });

  it("adds up the runs and tokens it was given", () => {
    const { container } = render(<AiDashboardBlock {...BASE} models={MODELS} />);
    const footer = container.querySelector("tfoot") as HTMLElement;

    expect(within(footer).getByText("1,060")).toBeInTheDocument();
    expect(within(footer).getByText("12,300,000")).toBeInTheDocument();
  });

  it("omits the model table entirely when there is nothing to break down", () => {
    render(<AiDashboardBlock {...BASE} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("lists recent runs with their state as text", () => {
    render(<AiDashboardBlock {...BASE} recentRuns={RUNS} />);

    expect(screen.getByText("Working")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("does not let every run in the list announce itself", () => {
    const { container } = render(<AiDashboardBlock {...BASE} recentRuns={RUNS} />);

    // A list of live regions is a stream of interruptions.
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(0);
  });

  it("links a run to its own console when there is one", () => {
    render(<AiDashboardBlock {...BASE} recentRuns={RUNS} />);

    expect(screen.getByRole("link", { name: "Deduplicate contacts" })).toHaveAttribute(
      "href",
      "/runs/r1",
    );
    expect(screen.queryByRole("link", { name: "Summarise tickets" })).not.toBeInTheDocument();
  });

  it("explains an empty run list instead of showing an empty box", () => {
    render(<AiDashboardBlock {...BASE} />);
    expect(screen.getByText("No runs yet")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AiDashboardBlock
        {...BASE}
        spendValue={243.6}
        previousSpendValue={180}
        previousTokens={9_800_000}
        previousRuns={890}
        failureRate={0.04}
        previousFailureRate={0.06}
        models={MODELS}
        recentRuns={RUNS}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
