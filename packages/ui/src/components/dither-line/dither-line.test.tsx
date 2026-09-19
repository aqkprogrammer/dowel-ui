import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { axisIndices, DitherLine, lineY, type DitherLineDatum } from "./dither-line";

const WEEK: DitherLineDatum[] = [
  { label: "Mon", value: 1200 },
  { label: "Tue", value: 1500 },
  { label: "Wed", value: 1100 },
  { label: "Thu", value: 1800 },
  { label: "Fri", value: 2200 },
  { label: "Sat", value: 2900 },
  { label: "Sun", value: 1750 },
];

describe("line geometry", () => {
  it("keeps half a stroke clear of the edges", () => {
    expect(lineY(0, 100, 100)).toBeCloseTo(0.98);
    expect(lineY(100, 100, 100)).toBeCloseTo(0.02);
    expect(lineY(50, 100, 0)).toBe(0.5);
    expect(lineY(500, 100, 0)).toBe(0);
    expect(lineY(5, 0, 100)).toBeCloseTo(0.98);
  });

  it("labels every point up to eight, then five spread evenly", () => {
    expect(axisIndices(3)).toEqual([0, 1, 2]);
    expect(axisIndices(30)).toEqual([0, 7, 15, 22, 29]);
  });
});

describe("DitherLine", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 350, height: 120 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("is an image named with the range, high and low", () => {
    render(
      <DitherLine data={WEEK} label="Revenue" formatValue={(value) => `$${String(value)}`} />,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Revenue: 7 points from Mon to Sun. High $2900 on Sat, low $1100 on Wed.",
    );
  });

  it("strokes a spline over a dithered gradient fill", () => {
    render(<DitherLine data={WEEK} label="Revenue" color="info" />);
    act(() => void mock.flush(60));
    mock.reset();
    act(() => void mock.flush(1));
    const stroke = mock.calls.find((call) => call.method === "stroke");
    expect(stroke?.args).toEqual([]);
    expect(mock.ctx.strokeStyle).toBe("var(--color-info)");
    expect(mock.ctx.lineWidth).toBe(2);
    expect(mock.count("bezierCurveTo")).toBe(WEEK.length - 1);
    // Denser near the top of the plot than near the baseline.
    const cells = mock.calls.filter((call) => call.method === "fillRect");
    const upper = cells
      .filter((call) => (call.args[1] as number) < 60)
      .map((call) => call.args[2] as number);
    const lower = cells
      .filter((call) => (call.args[1] as number) > 100)
      .map((call) => call.args[2] as number);
    const mean = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean(upper)).toBeGreaterThan(mean(lower));
  });

  it("scrubs points by keyboard with a text readout", async () => {
    const user = userEvent.setup();
    const { container } = render(<DitherLine data={WEEK} label="Revenue" />);
    const slider = screen.getByRole("slider", { name: "Revenue" });
    await user.tab();
    expect(slider).toHaveAttribute(
      "aria-valuetext",
      `Sun: ${new Intl.NumberFormat().format(1750)}`,
    );
    await user.keyboard("{Home}");
    expect(container.querySelector("[data-slot=dither-cursor-readout]")).toHaveTextContent(
      "Mon",
    );
    expect(
      container.querySelector("[data-slot=dither-line-labels] [data-active]"),
    ).toHaveTextContent("Mon");
  });

  it("always carries the data as a table", () => {
    const { rerender } = render(<DitherLine data={WEEK} label="Revenue" categoryLabel="Day" />);
    expect(screen.getByRole("table", { name: "Revenue" })).toHaveClass("sr-only");
    expect(screen.getByRole("columnheader", { name: "Day" })).toBeInTheDocument();
    rerender(<DitherLine data={WEEK} label="Revenue" showTable showAxis={false} />);
    expect(screen.getByRole("table", { name: "Revenue" })).not.toHaveClass("sr-only");
  });

  it("handles a single point and no data", () => {
    const { rerender } = render(
      <DitherLine data={[{ label: "Today", value: 5 }]} label="One" max={10} />,
    );
    act(() => void mock.flush(30));
    expect(mock.count("stroke")).toBeGreaterThan(0);
    rerender(<DitherLine data={[]} label="None" />);
    mock.reset();
    act(() => void mock.flush(30));
    expect(screen.getByRole("img", { name: "None: No data." })).toBeInTheDocument();
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("uses a description, merges className, sizes by variant and forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <DitherLine
        ref={ref}
        data={WEEK}
        label="Revenue"
        description="Up."
        size="sm"
        className="gap-0"
        data-testid="line"
      />,
    );
    const root = screen.getByTestId("line");
    expect(ref.current).toBe(root);
    expect(screen.getByRole("img", { name: "Revenue: Up." })).toBeInTheDocument();
    expect(root.className).toContain("[--dither-line-height:7.5rem]");
    expect(root.className).toContain("gap-0");
    expect(root.className).not.toContain("gap-2");
  });

  it("has no axe violations", async () => {
    const user = userEvent.setup();
    const { container } = render(<DitherLine data={WEEK} label="Revenue" />);
    await user.tab();
    await expectNoA11yViolations(container);
  });
});
