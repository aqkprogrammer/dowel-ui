import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Meter, MeterLegend, MeterValue, type MeterSegment } from "./meter";

const SEGMENTS: MeterSegment[] = [
  { id: "docs", label: "Documents", value: 30, tone: "primary" },
  { id: "images", label: "Images", value: 20, tone: "info" },
];

function widthOf(container: HTMLElement, index: number): string {
  const segments = container.querySelectorAll("[data-slot='meter-segment']");
  return (segments[index] as HTMLElement).style.width;
}

describe("Meter", () => {
  it("exposes a meter, not a progressbar", () => {
    render(<Meter segments={SEGMENTS} max={100} label="Storage" />);

    expect(screen.getByRole("meter", { name: "Storage" })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("reports the total of its segments against the capacity", () => {
    render(<Meter segments={SEGMENTS} max={100} label="Storage" />);

    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "50");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  it("states the unit and the capacity in aria-valuetext", () => {
    // A bare "50" tells a screen reader user nothing about 50 of what.
    render(
      <Meter
        segments={SEGMENTS}
        max={100}
        label="Storage"
        format={(value) => `${String(value)} GB`}
      />,
    );

    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "50 GB of 100 GB");
  });

  describe("segment widths", () => {
    it("sizes segments as a share of capacity, not of the total", () => {
      // The usual hand-rolled bug: dividing by the total makes every meter
      // render completely full regardless of how much capacity is left.
      const { container } = render(<Meter segments={SEGMENTS} max={100} label="Storage" />);

      expect(widthOf(container, 0)).toBe("30%");
      expect(widthOf(container, 1)).toBe("20%");
    });

    it("renders nothing for a zero segment rather than a sliver", () => {
      const { container } = render(
        <Meter
          segments={[...SEGMENTS, { id: "video", label: "Video", value: 0 }]}
          max={100}
          label="Storage"
        />,
      );

      expect(container.querySelectorAll("[data-slot='meter-segment']")).toHaveLength(2);
    });

    it("fills the track when over capacity, and still reports the true value", () => {
      const { container } = render(
        <Meter segments={[{ id: "a", label: "Used", value: 150 }]} max={100} label="Storage" />,
      );

      expect(widthOf(container, 0)).toBe("100%");
      expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "150");
    });

    it("ignores a negative value instead of rendering it backwards", () => {
      const { container } = render(
        <Meter segments={[{ id: "a", label: "Used", value: -10 }]} max={100} label="Storage" />,
      );

      expect(container.querySelectorAll("[data-slot='meter-segment']")).toHaveLength(0);
      expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
    });

    it("survives a zero capacity without dividing by it", () => {
      const { container } = render(<Meter segments={SEGMENTS} max={0} label="Storage" />);
      expect(container.querySelector("[data-slot='meter']")).toBeInTheDocument();
    });
  });

  describe("over capacity", () => {
    it("marks itself over and says so in the accessible text", () => {
      render(
        <Meter segments={[{ id: "a", label: "Used", value: 120 }]} max={100} label="Seats" />,
      );

      expect(screen.getByRole("meter")).toHaveAttribute(
        "aria-valuetext",
        "120 of 100, over capacity",
      );
    });

    it("is not over when exactly at capacity", () => {
      const { container } = render(
        <Meter segments={[{ id: "a", label: "Used", value: 100 }]} max={100} label="Seats" />,
      );

      expect(container.querySelector("[data-slot='meter']")).not.toHaveAttribute("data-over");
    });

    it("reports strain before the limit, without changing the value", () => {
      const { container } = render(
        <Meter
          segments={[{ id: "a", label: "Used", value: 92 }]}
          max={100}
          warnAt={0.9}
          label="Seats"
        />,
      );

      const root = container.querySelector("[data-slot='meter']");
      expect(root).toHaveAttribute("data-strained");
      expect(root).not.toHaveAttribute("data-over");
      expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "92");
    });
  });

  describe("threshold", () => {
    it("places a marker proportionally and hides it from assistive tech", () => {
      const { container } = render(
        <Meter
          segments={SEGMENTS}
          max={100}
          label="Storage"
          threshold={{ value: 80, label: "Plan limit" }}
        />,
      );

      const marker = container.querySelector("[data-slot='meter-threshold']");
      expect(marker).toHaveAttribute("aria-hidden", "true");
      expect(marker).toHaveStyle({ left: "80%" });
    });

    it("omits a marker that falls outside the track", () => {
      const { container } = render(
        <Meter
          segments={SEGMENTS}
          max={100}
          label="Storage"
          threshold={{ value: 150, label: "Nonsense" }}
        />,
      );

      expect(container.querySelector("[data-slot='meter-threshold']")).not.toBeInTheDocument();
    });
  });

  describe("legend", () => {
    it("carries the per-segment detail as readable text", () => {
      render(
        <Meter segments={SEGMENTS} max={100} label="Storage">
          <MeterLegend />
        </Meter>,
      );

      expect(screen.getByText("Documents")).toBeInTheDocument();
      expect(screen.getByText("Images")).toBeInTheDocument();
    });

    it("formats legend numbers the same way as the meter", () => {
      render(
        <Meter
          segments={SEGMENTS}
          max={100}
          label="Storage"
          format={(value) => `${String(value)} GB`}
        >
          <MeterLegend />
        </Meter>,
      );

      expect(screen.getByText("30 GB")).toBeInTheDocument();
    });

    it("does not add extra widgets to the accessibility tree", () => {
      render(
        <Meter segments={SEGMENTS} max={100} label="Storage">
          <MeterLegend />
        </Meter>,
      );

      // One meter for one quantity — the segments must not each become one.
      expect(screen.getAllByRole("meter")).toHaveLength(1);
    });
  });

  it("renders the headline value line", () => {
    render(
      <Meter segments={SEGMENTS} max={100} label="Storage">
        <MeterValue />
      </Meter>,
    );

    expect(screen.getByText(/50 of 100/)).toBeInTheDocument();
  });

  it("throws a useful error when a part is used outside the root", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<MeterLegend />)).toThrow(/must be rendered inside <Meter>/);
    consoleError.mockRestore();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Meter
        segments={SEGMENTS}
        max={100}
        label="Storage"
        threshold={{ value: 80, label: "Plan limit" }}
      >
        <MeterValue />
        <MeterLegend />
      </Meter>,
    );

    await expectNoA11yViolations(container);
  });
});
