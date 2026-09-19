import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { DitherMeter, meterSpans, type DitherMeterSegment } from "./dither-meter";

const SEGMENTS: DitherMeterSegment[] = [
  { key: "db", label: "Database", value: 200 },
  { key: "assets", label: "Assets", value: 100, color: "info" },
];

function renderMeter(props: Partial<Parameters<typeof DitherMeter>[0]> = {}) {
  return render(<DitherMeter segments={SEGMENTS} max={500} label="Storage" {...props} />);
}

describe("meterSpans", () => {
  it("stacks segments from the start, clamped to the bar", () => {
    const [a, b] = meterSpans([200, 100], 500);
    expect(a).toEqual([0, 0.4]);
    expect(b?.[0]).toBeCloseTo(0.4);
    expect(b?.[1]).toBeCloseTo(0.6);
    expect(meterSpans([80, 40], 100)).toEqual([
      [0, 0.8],
      [0.8, 1],
    ]);
    expect(meterSpans([5, -2], 0)).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });
});

describe("DitherMeter", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 300, height: 24 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("is a meter of used over capacity, reading its breakdown", () => {
    renderMeter();
    const meter = screen.getByRole("meter", { name: "Storage" });
    expect(meter).toHaveAttribute("aria-valuenow", "300");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "500");
    expect(meter).toHaveAttribute(
      "aria-valuetext",
      "300 of 500 used (60%). Database 200 (40%), Assets 100 (20%); free 200.",
    );
  });

  it("always carries the data as a table, with the free remainder", () => {
    const { rerender } = renderMeter();
    const table = screen.getByRole("table", { name: "Storage" });
    expect(table).toHaveClass("sr-only");
    expect(screen.getByRole("rowheader", { name: "Free" })).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: "40%" }).length).toBe(2);
    rerender(<DitherMeter segments={SEGMENTS} label="Storage" showTable />);
    expect(table).not.toHaveClass("sr-only");
  });

  it("shows used of capacity and a legend", () => {
    const { container } = renderMeter();
    const value = container.querySelector("[data-slot=dither-meter-value]");
    expect(value).toHaveAttribute("aria-hidden", "true");
    expect(value).toHaveTextContent("300 of 50060%");
    expect(screen.getByRole("button", { name: "Database 200" })).toBeInTheDocument();
    expect(container.querySelector("[data-slot=dither-meter-legend]")).toHaveTextContent(
      "Free 200",
    );
  });

  it("draws a faint track and each segment clipped in its colour", () => {
    renderMeter();
    act(() => void mock.flush(120));
    mock.reset();
    act(() => void mock.flush(1));
    // The bar clip plus one per segment.
    expect(mock.count("clip")).toBe(3);
    const fills = mock.calls.filter((call) => call.method === "fillRect");
    expect(fills[0]?.fillStyle).toBe("var(--color-foreground)");
    expect(fills[0]?.globalAlpha).toBeCloseTo(0.1);
    const info = fills
      .filter((call) => call.fillStyle === "var(--color-info)")
      .map((call) => call.args[0] as number);
    expect(Math.min(...info)).toBeGreaterThan(300 * 0.4 - 4);
    expect(Math.max(...info)).toBeLessThan(300 * 0.6);
  });

  it("previews a category from the legend and dims the rest", async () => {
    const user = userEvent.setup();
    renderMeter();
    const assets = screen.getByRole("button", { name: "Assets 100" });
    fireEvent.pointerEnter(assets);
    expect(assets).toHaveAttribute("data-active", "true");
    act(() => void mock.flush(90));
    mock.reset();
    act(() => void mock.flush(1));
    const alphas = new Set(
      mock.calls
        .filter(
          (call) => call.method === "fillRect" && call.fillStyle !== "var(--color-foreground)",
        )
        .map((call) => call.globalAlpha),
    );
    expect(alphas).toEqual(new Set([0.3, 0.85]));
    fireEvent.pointerLeave(assets);
    expect(assets).not.toHaveAttribute("data-active");
    await user.tab();
    expect(screen.getByRole("button", { name: "Database 200" })).toHaveAttribute(
      "data-active",
      "true",
    );
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "Database 200" })).not.toHaveAttribute(
      "data-active",
    );
  });

  it("pins a category when pressed", async () => {
    const user = userEvent.setup();
    const onActiveSegmentChange = vi.fn();
    renderMeter({ onActiveSegmentChange });
    const db = screen.getByRole("button", { name: "Database 200" });
    await user.click(db);
    expect(db).toHaveAttribute("aria-pressed", "true");
    expect(onActiveSegmentChange).toHaveBeenLastCalledWith("db");
    await user.click(db);
    expect(onActiveSegmentChange).toHaveBeenLastCalledWith(null);
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [key, setKey] = useState<string | null>("assets");
      return (
        <DitherMeter
          segments={SEGMENTS}
          label="Storage"
          activeSegment={key}
          onActiveSegmentChange={setKey}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("button", { name: "Assets 100" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Database 200" }));
    expect(screen.getByRole("button", { name: "Assets 100" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("fills and settles; under reduced motion it lands at once", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("reduce"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    renderMeter();
    act(() => void mock.flush(1));
    expect(mock.count("fillRect")).toBeGreaterThan(10);
    expect(mock.pending()).toBe(0);
  });

  it("defaults capacity to the total, formats, and handles no segments", () => {
    const { rerender } = render(
      <DitherMeter
        segments={SEGMENTS}
        label="Disk"
        formatValue={(value) => `${String(value)} GB`}
        showLegend={false}
        showValue={false}
      />,
    );
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuemax", "300");
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<DitherMeter segments={[]} label="Empty" description="Nothing stored." />);
    act(() => void mock.flush(5));
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "Nothing stored.");
  });

  it("merges className, sizes by variant and forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    renderMeter({ ref, size: "lg", className: "gap-4" });
    const root = ref.current!;
    expect(root).toHaveAttribute("data-slot", "dither-meter");
    expect(root.className).toContain("[--dither-meter-height:2.25rem]");
    expect(root.className).toContain("gap-4");
    expect(root.className).not.toContain("gap-2");
  });

  it("has no axe violations", async () => {
    const { container } = renderMeter({ showTable: true, defaultActiveSegment: "db" });
    await expectNoA11yViolations(container);
  });
});
