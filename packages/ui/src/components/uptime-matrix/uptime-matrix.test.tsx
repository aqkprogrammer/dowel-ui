import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { dayFromKey, UptimeMatrix, type UptimeDay } from "./uptime-matrix";

const DAYS: UptimeDay[] = [
  { label: "Jul 1", status: "operational", uptime: 100 },
  { label: "Jul 2", status: "degraded", uptime: 99.2, note: "Slow API" },
  { label: "Jul 3", status: "outage", uptime: 96.5 },
  { label: "Jul 4", status: "operational", uptime: 100 },
];

function renderMatrix(props: Partial<Parameters<typeof UptimeMatrix>[0]> = {}) {
  return render(<UptimeMatrix days={DAYS} label="API" {...props} />);
}

const readout = (container: HTMLElement) =>
  container.querySelector("[data-slot=uptime-matrix-readout]");

describe("dayFromKey", () => {
  it("moves linearly and by rows, clamped", () => {
    expect(dayFromKey("ArrowRight", false, 3, 10, 5)).toBe(4);
    expect(dayFromKey("ArrowRight", false, 9, 10, 5)).toBe(9);
    expect(dayFromKey("ArrowLeft", false, 0, 10, 5)).toBe(0);
    expect(dayFromKey("ArrowDown", false, 3, 10, 5)).toBe(8);
    expect(dayFromKey("ArrowDown", false, 7, 10, 5)).toBe(7);
    expect(dayFromKey("ArrowUp", false, 7, 10, 5)).toBe(2);
    expect(dayFromKey("ArrowUp", false, 2, 10, 5)).toBe(2);
    expect(dayFromKey("Home", false, 7, 10, 5)).toBe(5);
    expect(dayFromKey("End", false, 6, 8, 5)).toBe(7);
    expect(dayFromKey("Home", true, 7, 10, 5)).toBe(0);
    expect(dayFromKey("End", true, 2, 10, 5)).toBe(9);
    expect(dayFromKey("x", false, 2, 10, 5)).toBeNull();
  });
});

describe("UptimeMatrix", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 200, height: 28 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("is an image counting each state with the average uptime", () => {
    renderMatrix();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "API: 4 days: 2 operational, 1 degraded, 1 outage. Average uptime 98.93%.",
    );
  });

  it("always carries the data as a table", () => {
    const { rerender } = renderMatrix();
    const table = screen.getByRole("table", { name: "API" });
    expect(table).toHaveClass("sr-only");
    expect(screen.getByRole("columnheader", { name: "Note" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Slow API" })).toBeInTheDocument();
    rerender(
      <UptimeMatrix days={[{ label: "Today", status: "operational" }]} label="API" showTable />,
    );
    expect(table).not.toHaveClass("sr-only");
    expect(screen.queryByRole("columnheader", { name: "Uptime" })).toBeNull();
  });

  it("draws each day in its state token, degraded striped and outage solid", () => {
    renderMatrix();
    act(() => void mock.flush(1));
    expect(mock.count("clip")).toBe(4);
    const fills = mock.calls.filter((call) => call.method === "fillRect");
    const colours = new Set(fills.map((call) => call.fillStyle));
    expect(colours).toEqual(
      new Set(["var(--color-success)", "var(--color-warning)", "var(--color-destructive)"]),
    );
    const mean = (colour: string) => {
      const sizes = fills
        .filter((call) => call.fillStyle === colour)
        .map((call) => call.args[2] as number);
      return sizes.reduce((a, b) => a + b, 0) / sizes.length;
    };
    expect(mean("var(--color-destructive)")).toBeGreaterThan(mean("var(--color-success)"));
    expect(mean("var(--color-warning)")).toBeLessThan(mean("var(--color-success)"));
  });

  it("is a grid with one tab stop, navigated by arrow keys", async () => {
    const user = userEvent.setup();
    const onActiveIndexChange = vi.fn();
    const { container } = renderMatrix({ onActiveIndexChange });
    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(4);
    expect(cells[1]).toHaveTextContent("Jul 2: Degraded, 99.2% uptime. Slow API");
    await user.tab();
    expect(cells[0]).toHaveFocus();
    expect(readout(container)).toHaveTextContent("Jul 1Operational· 100%");
    await user.keyboard("{ArrowRight}");
    expect(cells[1]).toHaveFocus();
    expect(cells[1]).toHaveAttribute("tabindex", "0");
    expect(readout(container)).toHaveTextContent("Slow API");
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(1);
    await user.keyboard("{End}");
    expect(cells[3]).toHaveFocus();
    expect(readout(container)?.getAttribute("style")).toContain("translate(-100%");
    await user.keyboard("{Home}");
    expect(cells[0]).toHaveFocus();
    await user.keyboard("q");
    await user.keyboard("{Escape}");
    expect(readout(container)).toBeNull();
    await user.keyboard("{Escape}");
    await user.tab();
    expect(readout(container)).toBeNull();
  });

  it("wraps into rows of `columns`", async () => {
    const user = userEvent.setup();
    renderMatrix({ columns: 2 });
    expect(within(screen.getByRole("grid")).getAllByRole("row")).toHaveLength(2);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("gridcell")[2]).toHaveFocus();
    await user.keyboard("{Control>}{End}{/Control}");
    expect(screen.getAllByRole("gridcell")[3]).toHaveFocus();
  });

  it("shows the readout on hover, dims the other days, and hides on leave", () => {
    const { container } = renderMatrix();
    fireEvent.pointerEnter(screen.getAllByRole("gridcell")[2]!);
    expect(readout(container)).toHaveTextContent("Jul 3Outage· 96.5%");
    act(() => void mock.flush(1));
    const alphas = new Set(
      mock.calls.filter((call) => call.method === "fillRect").map((call) => call.globalAlpha),
    );
    expect([...alphas].some((alpha) => Math.abs(alpha - 0.85 * 0.55) < 1e-9)).toBe(true);
    fireEvent.pointerLeave(screen.getByRole("grid"));
    expect(readout(container)).toBeNull();
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [index, setIndex] = useState<number | null>(2);
      return (
        <UptimeMatrix
          days={DAYS}
          label="API"
          activeIndex={index}
          onActiveIndexChange={setIndex}
        />
      );
    }
    const { container } = render(<Controlled />);
    expect(readout(container)).toHaveTextContent("Jul 3");
    await user.tab();
    expect(readout(container)).toHaveTextContent("Jul 1");
  });

  it("names states in a legend, translates them, and labels the axis", () => {
    const { container } = render(
      <UptimeMatrix
        days={[...DAYS, { label: "Jul 5", status: "unknown" }]}
        label="API"
        statusLabels={{ outage: "Down" }}
        startLabel="90 days ago"
        endLabel="Today"
        formatUptime={(value) => value.toFixed(1)}
      />,
    );
    expect(container.querySelector("[data-slot=uptime-matrix-legend]")).toHaveTextContent(
      "Operational 2Degraded 1Down 1No data 1",
    );
    const axis = container.querySelector("[data-slot=uptime-matrix-axis]");
    expect(axis).toHaveAttribute("aria-hidden", "true");
    expect(axis).toHaveTextContent("90 days ago98.9 uptimeToday");
    act(() => void mock.flush(1));
    const unknown = mock.calls.find(
      (call) =>
        call.method === "fillRect" && call.fillStyle === "var(--color-muted-foreground)",
    );
    expect(unknown?.globalAlpha).toBeCloseTo(0.35);
  });

  it("handles no days and hides the legend and axis on request", () => {
    const { container, rerender } = render(<UptimeMatrix days={[]} label="None" />);
    act(() => void mock.flush(1));
    expect(screen.getByRole("img", { name: "None: No data." })).toBeInTheDocument();
    expect(screen.queryByRole("grid")).toBeNull();
    rerender(<UptimeMatrix days={DAYS} label="API" showLegend={false} showAxis={false} />);
    expect(container.querySelector("[data-slot=uptime-matrix-legend]")).toBeNull();
    expect(container.querySelector("[data-slot=uptime-matrix-axis]")).toBeNull();
  });

  it("uses a description, merges className, sizes by variant and forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    renderMatrix({ ref, description: "All good.", size: "lg", className: "gap-4" });
    const root = ref.current!;
    expect(root).toHaveAttribute("data-slot", "uptime-matrix");
    expect(screen.getByRole("img", { name: "API: All good." })).toBeInTheDocument();
    expect(root.className).toContain("[--uptime-matrix-height:2.5rem]");
    expect(root.className).toContain("gap-4");
    expect(root.className).not.toContain("gap-2");
  });

  it("has no axe violations", async () => {
    const { container } = renderMatrix({ showTable: true, columns: 3 });
    await expectNoA11yViolations(container);
  });
});
