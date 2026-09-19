import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import {
  bubbleRadius,
  DitherScatter,
  domainFraction,
  type DitherScatterDatum,
} from "./dither-scatter";

const DATA: DitherScatterDatum[] = [
  { label: "US", x: 50, y: 50, size: 35 },
  { label: "UK", x: 30, y: 80, size: 20, color: "info" },
  { label: "CA", x: 90, y: 20, size: 25 },
];

function renderScatter(props: Partial<Parameters<typeof DitherScatter>[0]> = {}) {
  return render(
    <DitherScatter
      data={DATA}
      label="Traffic"
      xDomain={[0, 100]}
      yDomain={[0, 100]}
      xLabel="Visits"
      yLabel="Bounce"
      sizeLabel="Sessions"
      {...props}
    />,
  );
}

const readout = (container: HTMLElement) =>
  container.querySelector("[data-slot=dither-scatter-readout]");

describe("scatter helpers", () => {
  it("places values within a domain", () => {
    expect(domainFraction(25, [0, 100])).toBe(0.25);
    expect(domainFraction(-5, [0, 100])).toBe(0);
    expect(domainFraction(500, [0, 100])).toBe(1);
    expect(domainFraction(5, [10, 10])).toBe(0);
    expect(domainFraction(Number.NaN, [0, 1])).toBe(0);
  });

  it("sizes bubbles by area", () => {
    expect(bubbleRadius(100, 100, 0.1, 0.3)).toBeCloseTo(0.3);
    expect(bubbleRadius(25, 100, 0, 0.3)).toBeCloseTo(0.15);
    expect(bubbleRadius(0, 100, 0.1, 0.3)).toBe(0.1);
    expect(bubbleRadius(5, 0, 0.1, 0.3)).toBe(0.1);
  });
});

describe("DitherScatter", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 320, height: 176 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("is an image named with every point", () => {
    renderScatter();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Traffic: 3 points. US: Visits 50, Bounce 50, Sessions 35; UK: Visits 30, Bounce 80, Sessions 20; CA: Visits 90, Bounce 20, Sessions 25.",
    );
  });

  it("always carries the data as a table", () => {
    const { rerender } = renderScatter({ categoryLabel: "Country" });
    const table = screen.getByRole("table", { name: "Traffic" });
    expect(table).toHaveClass("sr-only");
    expect(screen.getByRole("columnheader", { name: "Sessions" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Country" })).toBeInTheDocument();
    rerender(<DitherScatter data={DATA} label="Traffic" showTable />);
    expect(table).not.toHaveClass("sr-only");
  });

  it("gives each bubble a button, visible label first, placed like the canvas", () => {
    renderScatter();
    const us = screen.getByRole("button", { name: "US: Visits 50, Bounce 50, Sessions 35" });
    expect(us).toHaveTextContent("US");
    expect(us.style.left).toContain("0.5 *");
    expect(us.style.width).toContain("var(--dither-scatter-height)");
  });

  it("draws each bubble clipped to a circle in its colour", () => {
    renderScatter();
    act(() => void mock.flush(120));
    mock.reset();
    act(() => void mock.flush(1));
    expect(mock.count("clip")).toBe(3);
    const clip = mock.calls.find((call) => call.method === "clip")?.args[0] as {
      commands: { method: string }[];
    };
    expect(clip.commands.map((command) => command.method)).toContain("arc");
    const colours = new Set(
      mock.calls.filter((call) => call.method === "fillRect").map((call) => call.fillStyle),
    );
    expect(colours.size).toBe(3);
    expect(colours).toContain("var(--color-primary)");
    expect(colours).toContain("var(--color-info)");
  });

  it("shows a readout on hover and focus, dimming the other bubbles", async () => {
    const user = userEvent.setup();
    const { container } = renderScatter();
    const uk = screen.getByRole("button", { name: /^UK/ });
    fireEvent.pointerEnter(uk);
    expect(uk).toHaveAttribute("data-active", "true");
    expect(readout(container)).toHaveTextContent("UKVisits30Bounce80Sessions20");
    act(() => void mock.flush(60));
    mock.reset();
    act(() => void mock.flush(1));
    const alphas = new Set(
      mock.calls.filter((call) => call.method === "fillRect").map((call) => call.globalAlpha),
    );
    expect(alphas).toEqual(new Set([0.3, 0.85]));
    fireEvent.pointerLeave(uk);
    expect(readout(container)).toBeNull();
    await user.tab();
    expect(readout(container)).toHaveTextContent("US");
    await user.tab();
    await user.tab();
    expect(readout(container)?.getAttribute("style")).toContain("-100%");
    await user.tab();
    expect(readout(container)).toBeNull();
  });

  it("pins a point when pressed", async () => {
    const user = userEvent.setup();
    const onActiveIndexChange = vi.fn();
    const { container } = renderScatter({ onActiveIndexChange });
    const ca = screen.getByRole("button", { name: /^CA/ });
    await user.click(ca);
    expect(ca).toHaveAttribute("aria-pressed", "true");
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(2);
    fireEvent.pointerLeave(ca);
    ca.blur();
    expect(readout(container)).toHaveTextContent("CA");
    await user.click(ca);
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(null);
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [index, setIndex] = useState<number | null>(1);
      return (
        <DitherScatter
          data={DATA}
          label="Traffic"
          activeIndex={index}
          onActiveIndexChange={setIndex}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("button", { name: /^UK/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /^US/ }));
    expect(screen.getByRole("button", { name: /^US/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^UK/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("grows bubbles and settles, holding still under reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("reduce"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    renderScatter();
    act(() => void mock.flush(1));
    expect(mock.count("fillRect")).toBeGreaterThan(0);
    expect(mock.pending()).toBe(0);
  });

  it("derives domains, formats values and handles no data", () => {
    const { rerender } = render(
      <DitherScatter
        data={[{ label: "A", x: 3, y: 7, size: 2 }]}
        label="One"
        formatValue={(value) => `${String(value)}k`}
      />,
    );
    expect(screen.getByRole("button", { name: "A: X 3k, Y 7k, Size 2k" })).toBeInTheDocument();
    act(() => void mock.flush(60));
    expect(mock.count("fillRect")).toBeGreaterThan(0);
    rerender(<DitherScatter data={[]} label="None" />);
    act(() => void mock.flush(5));
    expect(screen.getByRole("img", { name: "None: No data." })).toBeInTheDocument();
  });

  it("uses a description, merges className, sizes by variant and forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    renderScatter({ ref, description: "Direct leads.", size: "lg", className: "gap-4" });
    const root = ref.current!;
    expect(root).toHaveAttribute("data-slot", "dither-scatter");
    expect(screen.getByRole("img", { name: "Traffic: Direct leads." })).toBeInTheDocument();
    expect(root.className).toContain("[--dither-scatter-height:15rem]");
    expect(root.className).toContain("gap-4");
    expect(root.className).not.toContain("gap-2");
  });

  it("has no axe violations", async () => {
    const { container } = renderScatter({ showTable: true, defaultActiveIndex: 0 });
    await expectNoA11yViolations(container);
  });
});
