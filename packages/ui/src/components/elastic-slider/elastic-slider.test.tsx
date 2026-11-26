import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ElasticSlider } from "./elastic-slider";

function bubble(container: HTMLElement) {
  return container.querySelector<HTMLElement>("[data-slot=elastic-slider-bubble]");
}

describe("ElasticSlider", () => {
  it("is a named slider exposing its value", () => {
    render(<ElasticSlider aria-label="Volume" defaultValue={12} />);
    const slider = screen.getByRole("slider", { name: "Volume" });
    expect(slider).toHaveAttribute("aria-valuenow", "12");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "100");
  });

  it("shows the value in an aria-hidden bubble", () => {
    const { container } = render(<ElasticSlider aria-label="Volume" defaultValue={78} />);
    expect(bubble(container)).toHaveTextContent("78");
    expect(bubble(container)).toHaveAttribute("aria-hidden", "true");
  });

  it("moves with the keyboard and stretches the bubble with the jump", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <ElasticSlider aria-label="Volume" defaultValue={12} onValueChange={onValueChange} />,
    );
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(13);
    await user.keyboard("{End}");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "100");
    expect(bubble(container)?.style.transform).toMatch(/scaleX\(1\.[1-9]/);
    expect(bubble(container)?.style.transition).toContain("var(--motion-scale, 1)");
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState(50);
      return (
        <>
          <ElasticSlider aria-label="Volume" value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("49", { selector: "output" })).toBeInTheDocument();
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "49");
  });

  it("speaks formatted values", () => {
    const { container } = render(
      <ElasticSlider
        aria-label="Volume"
        defaultValue={40}
        formatValue={(v) => `${String(v)}%`}
      />,
    );
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "40%");
    expect(bubble(container)).toHaveTextContent("40%");
  });

  it("rubber-bands past the end of the track while dragging, and lets go on release", () => {
    const { container } = render(<ElasticSlider aria-label="Volume" defaultValue={100} />);
    const root = container.querySelector<HTMLElement>("[data-slot=elastic-slider]");
    if (!root) throw new Error("no root");
    // jsdom lays nothing out: the track's box is all zeros, so any positive x is past its end.
    fireEvent.pointerMove(root, { buttons: 1, clientX: 80 });
    expect(bubble(container)?.style.transform).toMatch(/translateX\([1-9]/);
    fireEvent.pointerUp(root);
    expect(bubble(container)?.style.transform).toContain("translateX(0.00px)");
  });

  it("draws ticks, or none", () => {
    const { container, rerender } = render(<ElasticSlider aria-label="Volume" />);
    expect(container.querySelector("[data-slot=elastic-slider-ticks]")?.children).toHaveLength(
      11,
    );
    rerender(<ElasticSlider aria-label="Volume" ticks={0} />);
    expect(container.querySelector("[data-slot=elastic-slider-ticks]")).toBeNull();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(
      <ElasticSlider aria-label="Volume" ref={ref} className="w-64" />,
    );
    expect(ref.current).toBe(container.querySelector("[data-slot=elastic-slider]"));
    expect(ref.current).toHaveClass("w-64", "touch-none");
    expect(ref.current).not.toHaveClass("w-40");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ElasticSlider aria-label="Volume" defaultValue={12} />);
    await expectNoA11yViolations(container);
  });
});
