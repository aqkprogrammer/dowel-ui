import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Heartbeat } from "./heartbeat";

function root(container: HTMLElement) {
  return container.querySelector('[data-slot="heartbeat"]') as HTMLElement;
}

describe("Heartbeat", () => {
  it("reads as a labelled rate, with the drawing hidden", () => {
    const { container } = render(<Heartbeat />);
    expect(screen.getByText(/72 bpm/)).toHaveTextContent("Heart rate 72 bpm");
    expect(container.querySelector('[data-slot="heartbeat-trace"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("takes a label, a unit and a rate", () => {
    render(<Heartbeat bpm={120} label="Pulse" unit="BPM" />);
    expect(screen.getByText(/120 BPM/)).toHaveTextContent("Pulse 120 BPM");
  });

  it("times one sweep and one beat to the rate, on the motion scale", () => {
    const { container, rerender } = render(<Heartbeat bpm={60} />);
    expect(root(container).style.getPropertyValue("--beat")).toBe(
      "calc(1000ms * var(--motion-scale, 1))",
    );
    rerender(<Heartbeat bpm={120} />);
    expect(root(container).style.getPropertyValue("--beat")).toBe(
      "calc(500ms * var(--motion-scale, 1))",
    );
  });

  it("draws a faint base and a three-part beam whose heads travel together", () => {
    const { container } = render(<Heartbeat />);
    expect(container.querySelector('[data-slot="heartbeat-base"]')).not.toBeNull();
    const beam = [
      ...container.querySelectorAll<SVGPathElement>('[data-slot="heartbeat-pulse"] path'),
    ];
    expect(beam).toHaveLength(3);
    for (const path of beam) {
      const length = Number(path.getAttribute("stroke-dasharray")?.split(" ")[0]);
      expect(Number(path.style.getPropertyValue("--from"))).toBe(length);
      expect(Number(path.style.getPropertyValue("--to"))).toBe(length - 136);
    }
  });

  it("never divides by zero", () => {
    const { container } = render(<Heartbeat bpm={0} />);
    expect(root(container).style.getPropertyValue("--beat")).toContain("60000ms");
  });

  it.each([
    ["sm", "text-xs"],
    ["md", "text-sm"],
    ["lg", "text-base"],
  ] as const)("applies the %s size", (size, expected) => {
    const { container } = render(<Heartbeat size={size} />);
    expect(root(container)).toHaveClass(expected);
  });

  it("merges className and style, and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Heartbeat
        ref={ref}
        className="text-destructive"
        style={{ opacity: 0.5 }}
        data-testid="hb"
      />,
    );
    const element = screen.getByTestId("hb");
    expect(ref.current).toBe(element);
    expect(element).toHaveClass("text-destructive");
    expect(element).not.toHaveClass("text-foreground");
    expect(element.style.opacity).toBe("0.5");
    expect(element.style.getPropertyValue("--beat")).not.toBe("");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Heartbeat />);
    await expectNoA11yViolations(container);
  });
});
