import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { DitherDonut, type DitherDonutDatum } from "./dither-donut";

const DEVICES: DitherDonutDatum[] = [
  { label: "Mobile", value: 65 },
  { label: "Desktop", value: 25 },
  { label: "Tablet", value: 10, color: "info" },
];

/*
 * jsdom cannot resolve var() in a style, so resolveColor falls back to the CSS
 * expression itself — which is exactly what these tests want to read.
 */

function clipPaths(mock: CanvasMock) {
  return mock.calls
    .filter((call) => call.method === "clip")
    .map((call) =>
      (call.args[0] as { commands: { method: string }[] }).commands.map(
        (command) => command.method,
      ),
    );
}

describe("DitherDonut", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 200, height: 200 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("is an image named with a summary of every entry and the total", () => {
    render(<DitherDonut data={DEVICES} label="Device usage" />);
    const image = screen.getByRole("img");
    expect(image).toHaveAccessibleName(
      /^Device usage: Mobile 65 \(65%\), Desktop 25 \(25%\), Tablet 10 \(10%\)\. Total 100\.$/,
    );
  });

  it("uses a description in place of the generated summary", () => {
    render(<DitherDonut data={DEVICES} label="Device usage" description="Mostly mobile." />);
    expect(
      screen.getByRole("img", { name: "Device usage: Mostly mobile." }),
    ).toBeInTheDocument();
  });

  it("always carries the data as a table, visible on request", () => {
    const { rerender } = render(
      <DitherDonut data={DEVICES} label="Device usage" labels={{ category: "Device" }} />,
    );
    const table = screen.getByRole("table", { name: "Device usage" });
    expect(table).toHaveClass("sr-only");
    expect(screen.getByRole("columnheader", { name: "Device" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Tablet" })).toBeInTheDocument();
    rerender(<DitherDonut data={DEVICES} label="Device usage" showTable />);
    expect(table).not.toHaveClass("sr-only");
  });

  it("draws every wedge in dithered cells, each in its own colour", () => {
    render(<DitherDonut data={DEVICES} label="Device usage" />);
    act(() => void mock.flush(2));
    const colours = new Set(
      mock.calls.filter((call) => call.method === "fillRect").map((call) => call.fillStyle),
    );
    expect(colours).toContain("var(--color-primary)");
    expect(colours).toContain("var(--color-info)");
    expect(colours.size).toBe(3);
    // The graph look clips to rounded wedges.
    expect(clipPaths(mock)[0]).toContain("arcTo");
  });

  it("draws plain sectors in the flat look", () => {
    render(<DitherDonut data={DEVICES} label="Device usage" variant="flat" />);
    act(() => void mock.flush(2));
    expect(screen.getByRole("img").parentElement?.parentElement).toHaveAttribute(
      "data-variant",
      "flat",
    );
    const paths = clipPaths(mock);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((path) => !path.includes("arcTo"))).toBe(true);
  });

  it("previews a wedge from its legend entry on hover and focus, with particles and a readout", async () => {
    const user = userEvent.setup();
    const { container } = render(<DitherDonut data={DEVICES} label="Device usage" />);
    const readout = () => container.querySelector("[data-slot=dither-donut-readout]");
    expect(readout()).toHaveTextContent("Total100");

    const desktop = screen.getByRole("button", { name: "Desktop: 25 (25%)" });
    fireEvent.pointerEnter(desktop);
    expect(desktop).toHaveAttribute("data-active", "true");
    expect(readout()).toHaveTextContent("Desktop2525%");
    mock.reset();
    act(() => void mock.flush(2));
    const particles = mock.calls.filter(
      (call) => call.method === "fillRect" && call.fillStyle === "var(--color-foreground)",
    );
    expect(particles.length).toBeGreaterThan(0);
    // The other wedges dim.
    expect(
      mock.calls.some((call) => call.method === "fillRect" && call.globalAlpha === 0.3),
    ).toBe(true);
    fireEvent.pointerLeave(desktop);
    expect(readout()).toHaveTextContent("Total100");

    await user.tab();
    expect(screen.getByRole("button", { name: /^Mobile/ })).toHaveFocus();
    expect(readout()).toHaveTextContent("Mobile6565%");
    await user.tab();
    await user.tab();
    await user.tab();
    expect(readout()).toHaveTextContent("Total100");
  });

  it("pins an entry when its legend button is pressed, and unpins on a second press", async () => {
    const user = userEvent.setup();
    const onActiveIndexChange = vi.fn();
    render(
      <DitherDonut
        data={DEVICES}
        label="Device usage"
        onActiveIndexChange={onActiveIndexChange}
      />,
    );
    const tablet = screen.getByRole("button", { name: /^Tablet/ });
    expect(tablet).toHaveAttribute("aria-pressed", "false");
    await user.click(tablet);
    expect(tablet).toHaveAttribute("aria-pressed", "true");
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(2);
    await user.keyboard("{Enter}");
    expect(tablet).toHaveAttribute("aria-pressed", "false");
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(null);
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [active, setActive] = useState<number | null>(1);
      return (
        <DitherDonut
          data={DEVICES}
          label="Device usage"
          activeIndex={active}
          onActiveIndexChange={setActive}
        />
      );
    }
    const { container } = render(<Controlled />);
    expect(screen.getByRole("button", { name: /^Desktop/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(container.querySelector("[data-slot=dither-donut-readout]")).toHaveTextContent(
      "Desktop",
    );
    await user.click(screen.getByRole("button", { name: /^Mobile/ }));
    expect(screen.getByRole("button", { name: /^Mobile/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^Desktop/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("hit-tests the wedge under the pointer", () => {
    const { container } = render(
      <DitherDonut data={DEVICES} label="Device usage" defaultActiveIndex={null} />,
    );
    const image = screen.getByRole("img");
    vi.spyOn(image, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 200));
    const readout = () => container.querySelector("[data-slot=dither-donut-readout]");
    // Right of centre, in the ring: Mobile (65% from 12 o'clock clockwise).
    fireEvent.pointerMove(image, { clientX: 180, clientY: 100 });
    expect(readout()).toHaveTextContent("Mobile");
    // The hole.
    fireEvent.pointerMove(image, { clientX: 100, clientY: 100 });
    expect(readout()).toHaveTextContent("Total");
    // Upper left: Tablet (the last 10%).
    fireEvent.pointerMove(image, { clientX: 60, clientY: 30 });
    expect(readout()).toHaveTextContent("Tablet");
    fireEvent.pointerLeave(image);
    expect(readout()).toHaveTextContent("Total");
  });

  it("takes custom centre content, or none", () => {
    const { container, rerender } = render(
      <DitherDonut data={DEVICES} label="Device usage" center={<span>Devices</span>} />,
    );
    expect(container.querySelector("[data-slot=dither-donut-readout]")).toHaveTextContent(
      "Devices",
    );
    rerender(
      <DitherDonut data={DEVICES} label="Device usage" center={null} showLegend={false} />,
    );
    expect(container.querySelector("[data-slot=dither-donut-readout]")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("formats values and ignores negative ones in the shares", () => {
    render(
      <DitherDonut
        data={[
          { label: "A", value: 3 },
          { label: "B", value: -1 },
        ]}
        label="Split"
        formatValue={(value) => `$${String(value)}`}
      />,
    );
    expect(screen.getByRole("button", { name: "A: $3 (100%)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "B: $-1 (0%)" })).toBeInTheDocument();
  });

  it("settles and stops drawing under reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("reduced-motion"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    render(<DitherDonut data={DEVICES} label="Device usage" />);
    act(() => void mock.flush(10));
    expect(mock.pending()).toBe(0);
    expect(mock.count("fillRect")).toBeGreaterThan(0);
  });

  it("animates a data change through springs", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("reduced-motion"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const { rerender } = render(
      <DitherDonut data={DEVICES} label="Device usage" animate={false} />,
    );
    act(() => void mock.flush(10));
    rerender(
      <DitherDonut
        data={[...DEVICES, { label: "Watch", value: 20 }]}
        label="Device usage"
        animate={false}
      />,
    );
    act(() => void mock.flush(10));
    expect(screen.getByRole("button", { name: /^Watch/ })).toBeInTheDocument();
    expect(mock.pending()).toBe(0);
  });

  it("sizes by variant, merges className and forwards its ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <DitherDonut
        ref={ref}
        data={DEVICES}
        label="Device usage"
        size="lg"
        className="gap-x-2"
        data-testid="donut"
      />,
    );
    const root = screen.getByTestId("donut");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-slot", "dither-donut");
    expect(root.className).toContain("[--dither-donut-size:14rem]");
    expect(root.className).toContain("gap-x-2");
    expect(root.className).not.toContain("gap-x-6");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <DitherDonut data={DEVICES} label="Device usage" defaultActiveIndex={0} showTable />,
    );
    await expectNoA11yViolations(container);
  });
});
