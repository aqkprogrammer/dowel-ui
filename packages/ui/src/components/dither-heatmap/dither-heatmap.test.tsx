import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import {
  cellFromKey,
  DitherHeatmap,
  heatmapIntensity,
  type DitherHeatmapCell,
} from "./dither-heatmap";

const ROWS = ["Mon", "Tue"];
const COLUMNS = ["0:00", "2:00", "4:00"];
const VALUES = [
  [10, 40, 20],
  [0, 30, 5],
];

function renderMap(props: Partial<Parameters<typeof DitherHeatmap>[0]> = {}) {
  return render(
    <DitherHeatmap rows={ROWS} columns={COLUMNS} values={VALUES} label="Load" {...props} />,
  );
}

const readout = (container: HTMLElement) =>
  container.querySelector("[data-slot=dither-heatmap-readout]");

function reducedMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("reduce"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

describe("heatmap helpers", () => {
  it("maps values to intensity, optionally in levels", () => {
    expect(heatmapIntensity(20, 40)).toBe(0.5);
    expect(heatmapIntensity(-3, 40)).toBe(0);
    expect(heatmapIntensity(Number.NaN, 40)).toBe(0);
    expect(heatmapIntensity(80, 40)).toBe(1);
    expect(heatmapIntensity(5, 0)).toBe(0);
    expect(heatmapIntensity(13, 40, 5)).toBe(0.25);
    expect(heatmapIntensity(13, 40, 1)).toBe(0.325);
  });

  it("moves through a grid by key, clamped at the edges", () => {
    const at: DitherHeatmapCell = { row: 1, column: 1 };
    expect(cellFromKey("ArrowRight", false, at, 3, 3)).toEqual({ row: 1, column: 2 });
    expect(cellFromKey("ArrowLeft", false, at, 3, 3)).toEqual({ row: 1, column: 0 });
    expect(cellFromKey("ArrowUp", false, at, 3, 3)).toEqual({ row: 0, column: 1 });
    expect(cellFromKey("ArrowDown", false, { row: 2, column: 0 }, 3, 3)).toEqual({
      row: 2,
      column: 0,
    });
    expect(cellFromKey("Home", false, at, 3, 3)).toEqual({ row: 1, column: 0 });
    expect(cellFromKey("End", false, at, 3, 3)).toEqual({ row: 1, column: 2 });
    expect(cellFromKey("Home", true, at, 3, 3)).toEqual({ row: 0, column: 0 });
    expect(cellFromKey("End", true, at, 3, 3)).toEqual({ row: 2, column: 2 });
    expect(cellFromKey("a", false, at, 3, 3)).toBeNull();
  });
});

describe("DitherHeatmap", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 300, height: 100 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("is an image named with its size, total and peak", () => {
    renderMap();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Load: 2 rows by 3 columns. Total 105; peak Mon, 2:00: 40.",
    );
  });

  it("always carries the data as a table", () => {
    const { rerender } = renderMap({ rowLabel: "Day" });
    const table = screen.getByRole("table", { name: "Load" });
    expect(table).toHaveClass("sr-only");
    expect(screen.getByRole("columnheader", { name: "Day" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Tue" })).toBeInTheDocument();
    rerender(
      <DitherHeatmap rows={ROWS} columns={COLUMNS} values={VALUES} label="Load" showTable />,
    );
    expect(table).not.toHaveClass("sr-only");
  });

  it("is a grid with one tab stop, navigated by arrow keys", async () => {
    const user = userEvent.setup();
    const onActiveCellChange = vi.fn();
    const { container } = renderMap({ onActiveCellChange });
    const grid = screen.getByRole("grid", { name: "Load" });
    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(6);
    expect(cells.filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
    expect(grid).toHaveTextContent("Mon, 0:00: 10");
    await user.tab();
    expect(cells[0]).toHaveFocus();
    expect(readout(container)).toHaveTextContent("Mon, 0:00: 10");
    await user.keyboard("{ArrowRight}");
    expect(cells[1]).toHaveFocus();
    expect(cells[1]).toHaveAttribute("tabindex", "0");
    expect(cells[0]).toHaveAttribute("tabindex", "-1");
    expect(readout(container)).toHaveTextContent("Mon, 2:00: 40");
    expect(onActiveCellChange).toHaveBeenLastCalledWith({ row: 0, column: 1 });
    await user.keyboard("{ArrowDown}");
    expect(cells[4]).toHaveFocus();
    await user.keyboard("{End}");
    expect(cells[5]).toHaveFocus();
    expect(readout(container)).toHaveStyle({
      transform: "translate(-100%, calc(-100% - 0.375rem))",
    });
    await user.keyboard("{Control>}{Home}{/Control}");
    expect(cells[0]).toHaveFocus();
    await user.keyboard("x");
    expect(cells[0]).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(readout(container)).toBeNull();
    await user.keyboard("{Escape}");
    await user.tab();
    expect(readout(container)).toBeNull();
  });

  it("shows the readout on hover and hides it when the pointer leaves", () => {
    const { container } = renderMap({
      formatCell: ({ row, column, value }) => `${row} @ ${column} - ${String(value)} ops/s`,
    });
    const cells = screen.getAllByRole("gridcell");
    fireEvent.pointerEnter(cells[2]!);
    expect(readout(container)).toHaveTextContent("Mon @ 4:00 - 20 ops/s");
    expect(cells[2]).toHaveAttribute("data-active", "true");
    fireEvent.pointerLeave(screen.getByRole("grid"));
    expect(readout(container)).toBeNull();
  });

  it("draws every tile in its colour, the active one at full strength", () => {
    renderMap({ color: "info", defaultActiveCell: { row: 0, column: 1 } });
    act(() => void mock.flush(120));
    mock.reset();
    act(() => void mock.flush(1));
    expect(mock.count("clip")).toBe(6);
    const fills = mock.calls.filter((call) => call.method === "fillRect");
    expect(new Set(fills.map((call) => call.fillStyle))).toEqual(
      new Set(["var(--color-info)"]),
    );
    const alphas = new Set(fills.map((call) => call.globalAlpha));
    expect(alphas).toContain(1);
    // An empty tile still shows, faintly.
    expect(alphas).toContain(0.85 * 0.15);
  });

  it("quantises into levels and settles at once under reduced motion", () => {
    reducedMotion();
    renderMap({ levels: 5, max: 40, showLegend: true });
    act(() => void mock.flush(1));
    expect(mock.count("fillRect")).toBeGreaterThan(0);
    expect(mock.pending()).toBe(0);
    const alphas = new Set(
      mock.calls.filter((call) => call.method === "fillRect").map((call) => call.globalAlpha),
    );
    // 10/40 is level 1 of 4: 0.15 + 0.85 × 0.25.
    expect(
      [...alphas].some((alpha) => Math.abs(alpha - 0.85 * (0.15 + 0.85 * 0.25)) < 1e-9),
    ).toBe(true);
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [cell, setCell] = useState<DitherHeatmapCell | null>({ row: 1, column: 2 });
      return (
        <DitherHeatmap
          rows={ROWS}
          columns={COLUMNS}
          values={VALUES}
          label="Load"
          activeCell={cell}
          onActiveCellChange={setCell}
        />
      );
    }
    const { container } = render(<Controlled />);
    expect(readout(container)).toHaveTextContent("Tue, 4:00: 5");
    await user.tab();
    expect(readout(container)).toHaveTextContent("Mon, 0:00: 10");
  });

  it("renders axis labels aria-hidden, a legend, or neither", () => {
    const { container, rerender } = renderMap({ showLegend: true, lessLabel: "Fewer" });
    const rows = container.querySelector("[data-slot=dither-heatmap-rows]");
    expect(rows).toHaveAttribute("aria-hidden", "true");
    expect(rows).toHaveTextContent("MonTue");
    expect(container.querySelector("[data-slot=dither-heatmap-columns]")).toHaveTextContent(
      "0:002:004:00",
    );
    expect(container.querySelector("[data-slot=dither-heatmap-legend]")).toHaveTextContent(
      "FewerMore",
    );
    rerender(
      <DitherHeatmap
        rows={ROWS}
        columns={COLUMNS}
        values={VALUES}
        label="Load"
        showAxis={false}
      />,
    );
    expect(container.querySelector("[data-slot=dither-heatmap-rows]")).toBeNull();
    expect(container.querySelector("[data-slot=dither-heatmap-legend]")).toBeNull();
  });

  it("handles no data", () => {
    render(<DitherHeatmap rows={[]} columns={[]} values={[]} label="None" />);
    act(() => void mock.flush(5));
    expect(screen.getByRole("img", { name: "None: No data." })).toBeInTheDocument();
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("uses a description, merges className, sizes by variant and forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    renderMap({ ref, description: "Busy mornings.", size: "lg", className: "gap-4" });
    const root = ref.current!;
    expect(root).toHaveAttribute("data-slot", "dither-heatmap");
    expect(screen.getByRole("img", { name: "Load: Busy mornings." })).toBeInTheDocument();
    expect(root.className).toContain("[--dither-heatmap-height:12rem]");
    expect(root.className).toContain("gap-4");
    expect(root.className).not.toContain("gap-2");
  });

  it("has no axe violations", async () => {
    const { container } = renderMap({ showTable: true, showLegend: true });
    await expectNoA11yViolations(container);
  });
});
