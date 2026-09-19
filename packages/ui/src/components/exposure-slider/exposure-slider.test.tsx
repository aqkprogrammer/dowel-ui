import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DirectionProvider } from "@/components/direction";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ExposureSlider } from "./exposure-slider";

afterEach(() => {
  vi.restoreAllMocks();
});

function track(slider: HTMLElement) {
  return slider.querySelector<HTMLElement>('[data-slot="exposure-slider-track"]');
}

describe("ExposureSlider", () => {
  it("renders a named slider with its value and bounds", () => {
    render(<ExposureSlider aria-label="Exposure" />);
    const slider = screen.getByRole("slider", { name: "Exposure" });
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    expect(slider).toHaveAttribute("aria-valuemin", "-20");
    expect(slider).toHaveAttribute("aria-valuemax", "20");
    expect(slider).toHaveAttribute("aria-valuetext", "0");
    expect(slider).toHaveAttribute("aria-orientation", "horizontal");
    expect(slider.querySelectorAll('[data-slot="exposure-slider-notch"]')).toHaveLength(41);
  });

  it("marks the centre notch and hides the decoration", () => {
    const { container } = render(<ExposureSlider aria-label="Exposure" defaultValue={3} />);
    const centre = container.querySelectorAll(
      '[data-slot="exposure-slider-notch"][data-centre]',
    );
    expect(centre).toHaveLength(1);
    expect(container.querySelector('[data-slot="exposure-slider-indicator"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(container.querySelector('[data-slot="exposure-slider-value"]')).toHaveTextContent(
      "3",
    );
  });

  it("moves with the arrow keys, Page Up/Down, Home and End", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    render(
      <ExposureSlider
        aria-label="Exposure"
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );
    const slider = screen.getByRole("slider");
    await user.tab();
    expect(slider).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuenow", "1");
    await user.keyboard("{ArrowUp}");
    expect(slider).toHaveAttribute("aria-valuenow", "2");
    await user.keyboard("{ArrowLeft}{ArrowDown}{ArrowDown}");
    expect(slider).toHaveAttribute("aria-valuenow", "-1");
    await user.keyboard("{PageUp}");
    expect(slider).toHaveAttribute("aria-valuenow", "9");
    await user.keyboard("{PageDown}");
    expect(slider).toHaveAttribute("aria-valuenow", "-1");
    await user.keyboard("{End}");
    expect(slider).toHaveAttribute("aria-valuenow", "20");
    await user.keyboard("{End}");
    await user.keyboard("{Home}");
    expect(slider).toHaveAttribute("aria-valuenow", "-20");
    await user.keyboard("a");

    expect(onValueChange).toHaveBeenLastCalledWith(-20);
    expect(onValueChange).toHaveBeenCalledTimes(9);
    expect(onValueCommit).toHaveBeenLastCalledWith(-20);
  });

  it("reverses Left and Right in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider dir="rtl">
        <ExposureSlider aria-label="Exposure" />
      </DirectionProvider>,
    );
    const slider = screen.getByRole("slider");
    slider.focus();
    await user.keyboard("{ArrowLeft}");
    expect(slider).toHaveAttribute("aria-valuenow", "1");
    expect(track(slider)?.style.transform).toBe("translateX(273px)");
  });

  it("drags relative to the pointer and snaps on release", () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    render(
      <ExposureSlider
        aria-label="Exposure"
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );
    const slider = screen.getByRole("slider");
    expect(track(slider)?.style.transform).toBe("translateX(-260px)");

    fireEvent.pointerDown(slider, { clientX: 200, pointerId: 1, button: 0 });
    expect(slider).toHaveAttribute("data-dragging");
    // 3 notches towards the start: the ruler follows the pointer exactly.
    fireEvent.pointerMove(slider, { clientX: 161, pointerId: 1 });
    expect(slider).toHaveAttribute("aria-valuenow", "3");
    expect(track(slider)?.style.transform).toBe("translateX(-299px)");
    fireEvent.pointerMove(slider, { clientX: 155, pointerId: 1 });
    expect(track(slider)?.style.transform).toBe("translateX(-305px)");

    fireEvent.pointerUp(slider, { pointerId: 1 });
    expect(slider).not.toHaveAttribute("data-dragging");
    expect(slider).toHaveAttribute("aria-valuenow", "3");
    expect(track(slider)?.style.transform).toBe("translateX(-299px)");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueCommit).toHaveBeenCalledExactlyOnceWith(3);

    // Moves after release do nothing, and a second release is ignored.
    fireEvent.pointerMove(slider, { clientX: 0, pointerId: 1 });
    fireEvent.pointerCancel(slider, { pointerId: 1 });
    expect(slider).toHaveAttribute("aria-valuenow", "3");
  });

  it("clamps a drag to the ends of the ruler", () => {
    render(<ExposureSlider aria-label="Exposure" min={0} max={5} defaultValue={2} />);
    const slider = screen.getByRole("slider");
    fireEvent.pointerDown(slider, { clientX: 500, pointerId: 1, button: 0 });
    fireEvent.pointerMove(slider, { clientX: 0, pointerId: 1 });
    expect(slider).toHaveAttribute("aria-valuenow", "5");
    fireEvent.pointerMove(slider, { clientX: 2000, pointerId: 1 });
    expect(slider).toHaveAttribute("aria-valuenow", "0");
  });

  it("ignores secondary buttons", () => {
    render(<ExposureSlider aria-label="Exposure" />);
    const slider = screen.getByRole("slider");
    fireEvent.pointerDown(slider, { clientX: 200, pointerId: 1, button: 2 });
    expect(slider).not.toHaveAttribute("data-dragging");
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState(0.5);
      return (
        <>
          <ExposureSlider
            aria-label="Exposure"
            min={-2}
            max={2}
            step={0.5}
            value={value}
            onValueChange={setValue}
            formatValue={(v) => `${v > 0 ? "+" : ""}${String(v)} EV`}
          />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuetext", "+0.5 EV");
    slider.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("status")).toHaveTextContent("1");
    expect(slider).toHaveAttribute("aria-valuetext", "+1 EV");
  });

  it("stays put when controlled and the parent does not update", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ExposureSlider aria-label="Exposure" value={4} onValueChange={onValueChange} />);
    const slider = screen.getByRole("slider");
    slider.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith(5);
    expect(slider).toHaveAttribute("aria-valuenow", "4");
  });

  it("fills the ring by sign", () => {
    const { container, rerender } = render(<ExposureSlider aria-label="Exposure" value={10} />);
    const arc = (sign: string) =>
      container.querySelector(`[data-sign="${sign}"]`)?.getAttribute("stroke-dasharray");
    expect(arc("positive")).toBe("0.5 0.5");
    expect(arc("negative")).toBe("0 1");
    rerender(<ExposureSlider aria-label="Exposure" value={-20} />);
    expect(arc("negative")).toBe("1 0");
    rerender(<ExposureSlider aria-label="Exposure" value={0} min={0} max={0} />);
    expect(arc("positive")).toBe("0 1");
  });

  it("hides the indicator on request", () => {
    const { container } = render(
      <ExposureSlider aria-label="Exposure" showIndicator={false} />,
    );
    expect(container.querySelector('[data-slot="exposure-slider-indicator"]')).toBeNull();
  });

  it("does nothing when disabled", async () => {
    const user = userEvent.setup();
    render(<ExposureSlider aria-label="Exposure" disabled name="ev" />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-disabled", "true");
    expect(slider).toHaveAttribute("tabindex", "-1");
    slider.focus();
    await user.keyboard("{ArrowRight}");
    fireEvent.pointerDown(slider, { clientX: 200, pointerId: 1, button: 0 });
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    expect(slider).not.toHaveAttribute("data-dragging");
  });

  it("submits its value with a form", () => {
    const { container } = render(
      <ExposureSlider aria-label="Exposure" name="ev" defaultValue={7} />,
    );
    expect(container.querySelector('input[name="ev"]')).toHaveValue("7");
  });

  it("moves naming attributes onto the slider", () => {
    render(
      <>
        <span id="ev-label">Exposure value</span>
        <span id="ev-hint">Drag or use the arrow keys</span>
        <ExposureSlider
          aria-labelledby="ev-label"
          aria-describedby="ev-hint"
          aria-valuetext="neutral"
          data-testid="root"
        />
      </>,
    );
    const slider = screen.getByRole("slider", { name: "Exposure value" });
    expect(slider).toHaveAccessibleDescription("Drag or use the arrow keys");
    expect(slider).toHaveAttribute("aria-valuetext", "neutral");
    expect(screen.getByTestId("root")).not.toHaveAttribute("aria-labelledby");
  });

  it("warns in development when unnamed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<ExposureSlider />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[ExposureSlider]"));
  });

  it("applies the accent variant, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ExposureSlider
        ref={ref}
        aria-label="Exposure"
        accent="primary"
        className="max-w-xs gap-2"
        data-testid="root"
      />,
    );
    const root = screen.getByTestId("root");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("max-w-xs", "gap-2", "[--exposure-accent:var(--color-primary)]");
    expect(root).not.toHaveClass("max-w-md");
    expect(root).not.toHaveClass("gap-6");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ExposureSlider aria-label="Exposure" defaultValue={-4} />);
    await expectNoA11yViolations(container);
  });
});
