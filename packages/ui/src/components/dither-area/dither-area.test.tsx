import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { AREA_HEADROOM, areaY, DitherArea, pointX, type DitherAreaDatum } from "./dither-area";

const DAYS: DitherAreaDatum[] = [
  { label: "Jul 1", value: 10 },
  { label: "Jul 2", value: 30 },
  { label: "Jul 3", value: 20 },
  { label: "Jul 4", value: 40 },
  { label: "Jul 5", value: 25 },
];

function readout(container: HTMLElement) {
  return container.querySelector("[data-slot=dither-cursor-readout]");
}

describe("area geometry", () => {
  it("places values below the headroom and points across the plot", () => {
    expect(areaY(0, 40)).toBe(1);
    expect(areaY(40, 40)).toBeCloseTo(AREA_HEADROOM);
    expect(areaY(20, 0)).toBe(1);
    expect(areaY(-5, 40)).toBe(1);
    expect(pointX(0, 5)).toBe(0);
    expect(pointX(4, 5)).toBe(1);
    expect(pointX(0, 1)).toBe(0.5);
  });
});

describe("DitherArea", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 400, height: 180 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("is an image named with the range, start, end and peak", () => {
    render(<DitherArea data={DAYS} label="New members" />);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "New members: 5 points from Jul 1 to Jul 5. Starts at 10, ends at 25; peak 40 on Jul 4.",
    );
  });

  it("always carries the data as a table, visible on request", () => {
    const { rerender } = render(
      <DitherArea data={DAYS} label="New members" categoryLabel="Date" valueLabel="Members" />,
    );
    const table = screen.getByRole("table", { name: "New members" });
    expect(table).toHaveClass("sr-only");
    expect(screen.getByRole("columnheader", { name: "Members" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Jul 3" })).toBeInTheDocument();
    rerender(<DitherArea data={DAYS} label="New members" showTable />);
    expect(table).not.toHaveClass("sr-only");
  });

  it("scrubs by keyboard as a slider, with a text readout", async () => {
    const user = userEvent.setup();
    const { container } = render(<DitherArea data={DAYS} label="New members" />);
    const slider = screen.getByRole("slider", { name: "New members" });
    expect(slider).toHaveAttribute("aria-valuemax", "4");
    expect(readout(container)).toBeNull();
    await user.tab();
    expect(slider).toHaveFocus();
    expect(slider).toHaveAttribute("aria-valuetext", "Jul 5: 25");
    expect(readout(container)).toHaveTextContent("Jul 525");
    await user.keyboard("{ArrowLeft}");
    expect(slider).toHaveAttribute("aria-valuetext", "Jul 4: 40");
    const top = Number.parseFloat(
      container.querySelector<HTMLElement>("[data-slot=dither-cursor-point]")?.style.top ?? "",
    );
    expect(top).toBeCloseTo(AREA_HEADROOM * 100);
    await user.keyboard("{Home}");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    expect(
      container.querySelector<HTMLElement>("[data-slot=dither-cursor-line]")?.style.left,
    ).toBe("0%");
    await user.keyboard("{Escape}");
    expect(readout(container)).toBeNull();
  });

  it("follows the pointer and swells the cells around the cursor", () => {
    const { container } = render(
      <DitherArea data={DAYS} label="New members" animate={false} />,
    );
    act(() => void mock.flush(200));
    mock.reset();
    const slider = screen.getByRole("slider");
    vi.spyOn(slider, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 400, 180));
    fireEvent.pointerMove(slider, { clientX: 300 });
    expect(slider).toHaveAttribute("aria-valuenow", "3");
    expect(readout(container)).toHaveTextContent("Jul 440");
    act(() => void mock.flush(1));
    const sizes = mock.calls
      .filter((call) => call.method === "fillRect" && call.fillStyle === "var(--color-primary)")
      .map((call) => call.args[2] as number);
    // Cells near the cursor are drawn larger than cells far from it.
    expect(Math.max(...sizes)).toBeGreaterThan(Math.min(...sizes) + 1);
    fireEvent.pointerLeave(slider);
    expect(readout(container)).toBeNull();
  });

  it("draws a faint cell grid and a clipped dithered area", () => {
    render(<DitherArea data={DAYS} label="New members" color="info" />);
    act(() => void mock.flush(60));
    mock.reset();
    act(() => void mock.flush(1));
    const grid = mock.calls.filter(
      (call) => call.method === "fillRect" && call.fillStyle === "var(--color-foreground)",
    );
    expect(grid.length).toBeGreaterThan(1000);
    expect(grid[0]?.globalAlpha).toBeCloseTo(0.05);
    expect(
      mock.calls.some(
        (call) => call.method === "fillRect" && call.fillStyle === "var(--color-info)",
      ),
    ).toBe(true);
    const clip = mock.calls.find((call) => call.method === "clip")?.args[0] as {
      commands: { method: string }[];
    };
    expect(clip.commands.map((command) => command.method)).toContain("closePath");
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    function Controlled() {
      const [index, setIndex] = useState<number | null>(2);
      return (
        <DitherArea
          data={DAYS}
          label="New members"
          index={index}
          onIndexChange={(next) => {
            onIndexChange(next);
            setIndex(next);
          }}
        />
      );
    }
    const { container } = render(<Controlled />);
    expect(readout(container)).toHaveTextContent("Jul 3");
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(onIndexChange).toHaveBeenLastCalledWith(3);
    expect(readout(container)).toHaveTextContent("Jul 4");
  });

  it("renders axis ticks and labels, aria-hidden, or none", () => {
    const { container, rerender } = render(
      <DitherArea data={DAYS} label="New members" max={40} />,
    );
    const ticks = container.querySelector("[data-slot=dither-area-ticks]");
    expect(ticks).toHaveAttribute("aria-hidden", "true");
    expect(ticks).toHaveTextContent("40");
    expect(container.querySelector("[data-slot=dither-area-labels]")).toHaveTextContent(
      "Jul 1Jul 2Jul 3Jul 4Jul 5",
    );
    rerender(<DitherArea data={DAYS} label="New members" showAxis={false} />);
    expect(container.querySelector("[data-slot=dither-area-ticks]")).toBeNull();
    expect(container.querySelector("[data-slot=dither-area-labels]")).toBeNull();
  });

  it("handles a single point and no data", () => {
    const { rerender } = render(
      <DitherArea data={[{ label: "Today", value: 5 }]} label="One" />,
    );
    act(() => void mock.flush(30));
    expect(mock.count("fillRect")).toBeGreaterThan(0);
    rerender(<DitherArea data={[]} label="None" />);
    act(() => void mock.flush(30));
    expect(screen.getByRole("img", { name: "None: No data." })).toBeInTheDocument();
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("uses a description, merges className, sizes by variant and forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <DitherArea
        ref={ref}
        data={DAYS}
        label="New members"
        description="Growing."
        size="lg"
        className="gap-4"
        data-testid="area"
      />,
    );
    const root = screen.getByTestId("area");
    expect(ref.current).toBe(root);
    expect(screen.getByRole("img", { name: "New members: Growing." })).toBeInTheDocument();
    expect(root.className).toContain("[--dither-area-height:16rem]");
    expect(root.className).toContain("gap-4");
    expect(root.className).not.toContain("gap-2");
  });

  it("has no axe violations, with the cursor showing", async () => {
    const user = userEvent.setup();
    const { container } = render(<DitherArea data={DAYS} label="New members" showTable />);
    await user.tab();
    await expectNoA11yViolations(container);
  });
});
