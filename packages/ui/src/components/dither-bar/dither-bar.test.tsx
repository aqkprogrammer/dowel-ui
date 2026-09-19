import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { DitherBar, segmentAt, type DitherBarDatum, type DitherBarSeries } from "./dither-bar";

const SERIES: DitherBarSeries[] = [
  { key: "cash", label: "Cash" },
  { key: "qr", label: "QR" },
  { key: "bank", label: "Bank", color: "info" },
];

const DATA: DitherBarDatum[] = [
  { label: "Bishkek", values: { cash: 50, qr: 30, bank: 20 } },
  { label: "Osh", values: { cash: 20, qr: 10 } },
];

function renderBar(props: Partial<Parameters<typeof DitherBar>[0]> = {}) {
  return render(<DitherBar series={SERIES} data={DATA} label="Revenue" max={100} {...props} />);
}

describe("segmentAt", () => {
  it("finds the band under a y position, bottom band first", () => {
    const fractions = [0.5, 0.3, 0.2];
    expect(segmentAt(fractions, 200, 150)).toBe(0);
    expect(segmentAt(fractions, 200, 80)).toBe(1);
    expect(segmentAt(fractions, 200, 10)).toBe(2);
    expect(segmentAt([0.5], 200, 10)).toBeNull();
    expect(segmentAt([0, 0.5], 200, 199)).toBe(1);
  });
});

describe("DitherBar", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 300, height: 200 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("is an image named with every stack's breakdown", () => {
    renderBar();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Revenue: 2 stacks of Cash, QR, Bank. Bishkek: Cash 50, QR 30, Bank 20; total 100. Osh: Cash 20, QR 10, Bank 0; total 30.",
    );
  });

  it("names each column button with its breakdown, visible label first", () => {
    renderBar();
    const column = screen.getByRole("button", {
      name: "Bishkek: Cash 50, QR 30, Bank 20; total 100",
    });
    expect(column).toHaveTextContent("Bishkek");
  });

  it("always carries the data as a table with totals", () => {
    const { rerender } = renderBar({ categoryLabel: "Branch" });
    const table = screen.getByRole("table", { name: "Revenue" });
    expect(table).toHaveClass("sr-only");
    expect(screen.getByRole("columnheader", { name: "Branch" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Total" })).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: "30" }).length).toBeGreaterThan(0);
    rerender(<DitherBar series={SERIES} data={DATA} label="Revenue" showTable />);
    expect(table).not.toHaveClass("sr-only");
  });

  it("draws each band in cells of its series colour, clipped to a rounded segment", () => {
    renderBar();
    act(() => void mock.flush(120));
    mock.reset();
    act(() => void mock.flush(1));
    const colours = new Set(
      mock.calls.filter((call) => call.method === "fillRect").map((call) => call.fillStyle),
    );
    expect(colours).toContain("var(--color-primary)");
    expect(colours).toContain("var(--color-info)");
    // Bishkek has three bands, Osh two (no bank).
    expect(mock.count("clip")).toBe(5);
  });

  it("grows bars from zero and settles", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: false,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    renderBar({ animate: false });
    act(() => void mock.flush(1));
    // First frame: springs still at zero, so nothing drawn yet.
    expect(mock.count("fillRect")).toBe(0);
    act(() => void mock.flush(300));
    expect(mock.count("fillRect")).toBeGreaterThan(0);
    expect(mock.pending()).toBe(0);
  });

  it("lights a series from the legend on hover and focus, dimming the rest", async () => {
    const user = userEvent.setup();
    renderBar();
    const cash = screen.getByRole("button", { name: "Cash" });
    fireEvent.pointerEnter(cash);
    expect(cash).toHaveAttribute("data-active", "true");
    act(() => void mock.flush(60));
    mock.reset();
    act(() => void mock.flush(1));
    const alphas = new Set(
      mock.calls.filter((call) => call.method === "fillRect").map((call) => call.globalAlpha),
    );
    expect(alphas).toContain(1);
    expect(alphas).toContain(0.3);
    fireEvent.pointerLeave(cash);
    expect(cash).not.toHaveAttribute("data-active");
    await user.tab();
    expect(cash).toHaveFocus();
    expect(cash).toHaveAttribute("data-active", "true");
    await user.tab();
    expect(cash).not.toHaveAttribute("data-active");
  });

  it("pins a series when its legend entry is pressed", async () => {
    const user = userEvent.setup();
    const onActiveSeriesChange = vi.fn();
    renderBar({ onActiveSeriesChange });
    const qr = screen.getByRole("button", { name: "QR" });
    await user.click(qr);
    expect(qr).toHaveAttribute("aria-pressed", "true");
    expect(onActiveSeriesChange).toHaveBeenLastCalledWith("qr");
    await user.click(qr);
    expect(qr).toHaveAttribute("aria-pressed", "false");
    expect(onActiveSeriesChange).toHaveBeenLastCalledWith(null);
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [active, setActive] = useState<string | null>("bank");
      return (
        <DitherBar
          series={SERIES}
          data={DATA}
          label="Revenue"
          activeSeries={active}
          onActiveSeriesChange={setActive}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("button", { name: "Bank" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Cash" }));
    expect(screen.getByRole("button", { name: "Cash" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Bank" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("shows a column's readout on focus, and pins it when pressed", async () => {
    const user = userEvent.setup();
    const { container } = renderBar({ showLegend: false });
    const readout = () => container.querySelector("[data-slot=dither-bar-readout]");
    expect(readout()).toBeNull();
    await user.tab();
    const bishkek = screen.getByRole("button", { name: /^Bishkek/ });
    expect(bishkek).toHaveFocus();
    expect(readout()).toHaveTextContent("BishkekCash50QR30Bank20Total100");
    expect(readout()).toHaveStyle({ left: "25%" });
    await user.keyboard("{Enter}");
    expect(bishkek).toHaveAttribute("aria-pressed", "true");
    await user.tab();
    expect(readout()).toHaveTextContent("Osh");
    await user.tab();
    expect(readout()).toHaveTextContent("Bishkek");
    await user.click(bishkek);
    expect(bishkek).toHaveAttribute("aria-pressed", "false");
    await user.tab();
    await user.tab();
    expect(readout()).toBeNull();
  });

  it("lights the band under the pointer within a column", () => {
    const { container } = renderBar();
    const plot = screen.getByRole("img");
    vi.spyOn(plot, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 300, 200));
    const bishkek = screen.getByRole("button", { name: /^Bishkek/ });
    fireEvent.pointerMove(bishkek, { clientY: 150 });
    const rows = () => [
      ...(container.querySelectorAll("[data-slot=dither-bar-readout] dl > div") ?? []),
    ];
    expect(rows()[0]).toHaveAttribute("data-active", "true");
    expect(rows()[1]).not.toHaveAttribute("data-active");
    fireEvent.pointerMove(bishkek, { clientY: 80 });
    expect(rows()[1]).toHaveAttribute("data-active", "true");
    act(() => void mock.flush(60));
    mock.reset();
    act(() => void mock.flush(1));
    const alphas = new Set(
      mock.calls.filter((call) => call.method === "fillRect").map((call) => call.globalAlpha),
    );
    expect(alphas).toContain(0.48);
    expect(alphas).toContain(0.3);
    fireEvent.pointerLeave(bishkek);
    expect(container.querySelector("[data-slot=dither-bar-readout]")).toBeNull();
  });

  it("derives a round axis maximum when none is given, and ignores bad values", () => {
    render(
      <DitherBar
        series={SERIES}
        data={[{ label: "A", values: { cash: 42, qr: Number.NaN, bank: -3 } }]}
        label="Mixed"
        formatValue={(value) => `$${String(value)}`}
      />,
    );
    expect(
      screen.getByRole("button", { name: "A: Cash $42, QR $0, Bank $0; total $42" }),
    ).toBeInTheDocument();
    act(() => void mock.flush(60));
    expect(mock.count("fillRect")).toBeGreaterThan(0);
  });

  it("sizes by variant, merges className and forwards its ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    renderBar({ ref, size: "sm", className: "gap-1", "data-testid": "bar" } as never);
    const root = screen.getByTestId("bar");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-slot", "dither-bar");
    expect(root.className).toContain("[--dither-bar-height:8rem]");
    expect(root.className).toContain("gap-1");
    expect(root.className).not.toContain("gap-3");
  });

  it("has no axe violations", async () => {
    const { container } = renderBar({ showTable: true, defaultActiveSeries: "cash" });
    await expectNoA11yViolations(container);
  });
});
