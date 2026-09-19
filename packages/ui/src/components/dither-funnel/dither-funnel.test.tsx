import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { DitherFunnel, funnelConversions, type DitherFunnelStage } from "./dither-funnel";

const STAGES: DitherFunnelStage[] = [
  { label: "Visitors", value: 100 },
  { label: "Leads", value: 62 },
  { label: "Deals", value: 31, color: "info" },
];

function renderFunnel(props: Partial<Parameters<typeof DitherFunnel>[0]> = {}) {
  return render(<DitherFunnel stages={STAGES} label="Sales" {...props} />);
}

const readout = (container: HTMLElement) =>
  container.querySelector("[data-slot=dither-funnel-readout]");

describe("funnelConversions", () => {
  it("gives overall and step conversion and drop-off", () => {
    expect(funnelConversions(STAGES)).toEqual([
      { overall: 1, step: 1, dropped: 0 },
      { overall: 0.62, step: 0.62, dropped: 38 },
      { overall: 0.31, step: 0.5, dropped: 31 },
    ]);
    expect(
      funnelConversions([
        { label: "A", value: 0 },
        { label: "B", value: Number.NaN },
      ]),
    ).toEqual([
      { overall: 0, step: 0, dropped: 0 },
      { overall: 0, step: 0, dropped: 0 },
    ]);
  });
});

describe("DitherFunnel", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 300, height: 160 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("is an image named with every stage's conversion", () => {
    renderFunnel();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Sales: 3 stages. Visitors: 100; Leads: 62, 62% of Visitors, 62% from Visitors, 38 dropped; Deals: 31, 31% of Visitors, 50% from Leads, 31 dropped.",
    );
  });

  it("always carries the data as a table with both conversions", () => {
    const { rerender } = renderFunnel();
    const table = screen.getByRole("table", { name: "Sales" });
    expect(table).toHaveClass("sr-only");
    expect(screen.getByRole("columnheader", { name: "Step conversion" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "50%" })).toBeInTheDocument();
    rerender(<DitherFunnel stages={STAGES} label="Sales" showTable />);
    expect(table).not.toHaveClass("sr-only");
  });

  it("gives each stage a button showing its name and conversion", () => {
    renderFunnel();
    const leads = screen.getByRole("button", { name: /^Leads: 62/ });
    expect(leads).toHaveTextContent("Leads62%");
  });

  it("draws each bar clipped in its colour, lengths against the largest", () => {
    renderFunnel();
    act(() => void mock.flush(120));
    mock.reset();
    act(() => void mock.flush(1));
    expect(mock.count("clip")).toBe(3);
    const colours = new Set(
      mock.calls.filter((call) => call.method === "fillRect").map((call) => call.fillStyle),
    );
    expect(colours).toContain("var(--color-primary)");
    expect(colours).toContain("var(--color-info)");
    const xs = mock.calls
      .filter((call) => call.method === "fillRect" && call.fillStyle === "var(--color-info)")
      .map((call) => call.args[0] as number);
    expect(Math.max(...xs)).toBeLessThan(300 * 0.31 + 3);
  });

  it("fills the readout on hover and focus, dimming other stages", async () => {
    const user = userEvent.setup();
    const { container } = renderFunnel();
    expect(readout(container)).toBeEmptyDOMElement();
    const deals = screen.getByRole("button", { name: /^Deals/ });
    fireEvent.pointerEnter(deals);
    expect(deals).toHaveAttribute("data-active", "true");
    expect(readout(container)).toHaveTextContent("Deals: 31, 31% of Visitors, 50% from Leads");
    act(() => void mock.flush(60));
    mock.reset();
    act(() => void mock.flush(1));
    const alphas = new Set(
      mock.calls.filter((call) => call.method === "fillRect").map((call) => call.globalAlpha),
    );
    expect(alphas).toEqual(new Set([0.3, 0.85]));
    fireEvent.pointerLeave(deals);
    expect(readout(container)).toBeEmptyDOMElement();
    await user.tab();
    expect(readout(container)).toHaveTextContent("Visitors: 100");
    await user.tab();
    await user.tab();
    await user.tab();
    expect(readout(container)).toBeEmptyDOMElement();
  });

  it("pins a stage when pressed", async () => {
    const user = userEvent.setup();
    const onActiveStageChange = vi.fn();
    const { container } = renderFunnel({ onActiveStageChange });
    const leads = screen.getByRole("button", { name: /^Leads/ });
    await user.click(leads);
    expect(leads).toHaveAttribute("aria-pressed", "true");
    expect(onActiveStageChange).toHaveBeenLastCalledWith(1);
    fireEvent.pointerLeave(leads);
    leads.blur();
    expect(readout(container)).toHaveTextContent("Leads");
    await user.click(leads);
    expect(onActiveStageChange).toHaveBeenLastCalledWith(null);
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [stage, setStage] = useState<number | null>(2);
      return (
        <DitherFunnel
          stages={STAGES}
          label="Sales"
          activeStage={stage}
          onActiveStageChange={setStage}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("button", { name: /^Deals/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /^Visitors/ }));
    expect(screen.getByRole("button", { name: /^Visitors/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("grows bars and settles; under reduced motion it lands at once", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("reduce"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    renderFunnel();
    act(() => void mock.flush(1));
    expect(mock.count("fillRect")).toBeGreaterThan(0);
    expect(mock.pending()).toBe(0);
  });

  it("honours max and formatters, and handles no stages", () => {
    const { rerender } = render(
      <DitherFunnel
        stages={[{ label: "Signups", value: 40 }]}
        label="Trial"
        max={200}
        formatValue={(value) => `${String(value)} users`}
        formatPercent={(share) => share.toFixed(2)}
      />,
    );
    expect(screen.getByRole("button", { name: "Signups: 40 users" })).toHaveTextContent(
      "Signups1.00",
    );
    act(() => void mock.flush(90));
    const xs = mock.calls
      .filter((call) => call.method === "fillRect")
      .map((call) => call.args[0] as number);
    expect(Math.max(...xs)).toBeLessThan(300 * 0.2 + 3);
    rerender(<DitherFunnel stages={[]} label="None" />);
    act(() => void mock.flush(5));
    expect(screen.getByRole("img", { name: "None: No data." })).toBeInTheDocument();
  });

  it("uses a description, merges className, sizes by variant and forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    renderFunnel({ ref, description: "Healthy.", size: "sm", className: "gap-4" });
    const root = ref.current!;
    expect(root).toHaveAttribute("data-slot", "dither-funnel");
    expect(screen.getByRole("img", { name: "Sales: Healthy." })).toBeInTheDocument();
    expect(root.className).toContain("[--dither-funnel-height:7rem]");
    expect(root.className).toContain("gap-4");
    expect(root.className).not.toContain("gap-2");
  });

  it("has no axe violations", async () => {
    const { container } = renderFunnel({ showTable: true, defaultActiveStage: 1 });
    await expectNoA11yViolations(container);
  });
});
