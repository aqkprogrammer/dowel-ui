import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { DitherGauge, gaugeFraction, gaugeRings, type DitherGaugeMetric } from "./dither-gauge";

const METRICS: DitherGaugeMetric[] = [
  { key: "cpu", label: "CPU Load", value: 65 },
  { key: "memory", label: "Memory", value: 12, max: 16, color: "info" },
];

function renderGauge(props: Partial<Parameters<typeof DitherGauge>[0]> = {}) {
  return render(<DitherGauge metrics={METRICS} label="Server" {...props} />);
}

function fillAlphas(mock: CanvasMock) {
  return new Set(
    mock.calls.filter((call) => call.method === "fillRect").map((call) => call.globalAlpha),
  );
}

describe("gauge helpers", () => {
  it("clamps a reading to its scale", () => {
    expect(gaugeFraction({ key: "a", label: "A", value: 50 })).toBe(0.5);
    expect(gaugeFraction({ key: "a", label: "A", value: 8, max: 16 })).toBe(0.5);
    expect(gaugeFraction({ key: "a", label: "A", value: 120 })).toBe(1);
    expect(gaugeFraction({ key: "a", label: "A", value: -4 })).toBe(0);
    expect(gaugeFraction({ key: "a", label: "A", value: Number.NaN })).toBe(0);
    expect(gaugeFraction({ key: "a", label: "A", value: 4, max: 0 })).toBe(0);
  });

  it("nests rings inward without overlap", () => {
    const [a, b] = gaugeRings(100, 2);
    expect(a?.outer).toBe(100);
    expect(b!.outer).toBeLessThan(a!.inner);
    expect(gaugeRings(100, 1)[0]?.inner).toBe(86);
  });
});

describe("DitherGauge", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 240, height: 136 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("is an image named with every reading, and a meter for the centre", () => {
    renderGauge();
    expect(screen.getByRole("img")).toHaveAccessibleName("Server: CPU Load 65%, Memory 75%.");
    const meter = screen.getByRole("meter", { name: "CPU Load" });
    expect(meter).toHaveAttribute("aria-valuenow", "65");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(meter).toHaveAttribute("aria-valuetext", "65%");
    expect(meter).toHaveTextContent("65%CPU Load");
  });

  it("always carries the readings as a table", () => {
    const { rerender } = renderGauge();
    const table = screen.getByRole("table", { name: "Server" });
    expect(table).toHaveClass("sr-only");
    expect(screen.getByRole("rowheader", { name: "Memory" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "75%" })).toBeInTheDocument();
    rerender(<DitherGauge metrics={METRICS} label="Server" showTable />);
    expect(table).not.toHaveClass("sr-only");
  });

  it("draws a track and a clipped dithered fill per ring in its colour", () => {
    renderGauge();
    act(() => void mock.flush(120));
    mock.reset();
    act(() => void mock.flush(1));
    expect(mock.count("fill")).toBe(2);
    expect(mock.count("clip")).toBe(2);
    const colours = new Set(
      mock.calls.filter((call) => call.method === "fillRect").map((call) => call.fillStyle),
    );
    expect(colours).toEqual(new Set(["var(--color-primary)", "var(--color-info)"]));
  });

  it("previews a ring from the legend and dims the rest", async () => {
    const user = userEvent.setup();
    renderGauge();
    const memory = screen.getByRole("button", { name: "Memory 75%" });
    fireEvent.pointerEnter(memory);
    expect(memory).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("meter", { name: "Memory" })).toHaveAttribute(
      "aria-valuemax",
      "16",
    );
    act(() => void mock.flush(90));
    mock.reset();
    act(() => void mock.flush(1));
    expect(fillAlphas(mock)).toEqual(new Set([0.3, 0.9]));
    fireEvent.pointerLeave(memory);
    expect(screen.getByRole("meter", { name: "CPU Load" })).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole("button", { name: "CPU Load 65%" })).toHaveAttribute(
      "data-active",
      "true",
    );
    await user.tab();
    expect(screen.getByRole("meter", { name: "Memory" })).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole("meter", { name: "CPU Load" })).toBeInTheDocument();
  });

  it("chooses the centre's metric when a legend button is pressed", async () => {
    const user = userEvent.setup();
    const onActiveMetricChange = vi.fn();
    renderGauge({ onActiveMetricChange });
    const memory = screen.getByRole("button", { name: "Memory 75%" });
    await user.click(memory);
    expect(memory).toHaveAttribute("aria-pressed", "true");
    expect(onActiveMetricChange).toHaveBeenLastCalledWith("memory");
    fireEvent.pointerLeave(memory);
    expect(screen.getByRole("meter", { name: "Memory" })).toBeInTheDocument();
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [active, setActive] = useState("memory");
      return (
        <DitherGauge
          metrics={METRICS}
          label="Server"
          activeMetric={active}
          onActiveMetricChange={setActive}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("meter", { name: "Memory" })).toBeInTheDocument();
    const cpu = screen.getByRole("button", { name: "CPU Load 65%" });
    await user.click(cpu);
    fireEvent.pointerLeave(cpu);
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("meter", { name: "CPU Load" })).toBeInTheDocument();
  });

  it("sweeps from zero and settles; under reduced motion it lands at once", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("reduce"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    renderGauge();
    act(() => void mock.flush(1));
    expect(mock.count("fillRect")).toBeGreaterThan(0);
    expect(mock.pending()).toBe(0);
  });

  it("formats readings, hides the legend for one metric, and handles none", () => {
    const { rerender } = render(
      <DitherGauge
        metrics={[{ key: "net", label: "Network", value: 450, max: 1000 }]}
        label="Link"
        formatValue={(value) => `${String(value)} Mb/s`}
      />,
    );
    expect(screen.getByRole("meter", { name: "Network" })).toHaveAttribute(
      "aria-valuetext",
      "450 Mb/s",
    );
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<DitherGauge metrics={[]} label="Empty" />);
    act(() => void mock.flush(5));
    expect(screen.getByRole("img", { name: "Empty: No data." })).toBeInTheDocument();
    expect(screen.queryByRole("meter")).toBeNull();
  });

  it("uses a description, merges className, sizes by variant and forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    renderGauge({ ref, description: "Healthy.", size: "sm", className: "gap-1" });
    const root = ref.current!;
    expect(root).toHaveAttribute("data-slot", "dither-gauge");
    expect(screen.getByRole("img", { name: "Server: Healthy." })).toBeInTheDocument();
    expect(root.className).toContain("[--dither-gauge-height:6rem]");
    expect(root.className).toContain("gap-1");
    expect(root.className).not.toContain("gap-3");
  });

  it("has no axe violations", async () => {
    const { container } = renderGauge({ showTable: true });
    await expectNoA11yViolations(container);
  });
});
