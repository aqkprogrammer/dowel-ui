import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Scrubber } from "./scrubber";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockRect(element: Element) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 36,
    right: 200,
    width: 200,
    height: 36,
    toJSON: () => ({}),
  });
}

describe("Scrubber", () => {
  it("renders a slider named by its label, showing the formatted value", () => {
    const { container } = render(<Scrubber label="Opacity" defaultValue={0.5} />);
    const slider = screen.getByRole("slider", { name: "Opacity" });
    expect(slider).toHaveAttribute("aria-valuenow", "0.5");
    expect(slider).toHaveAttribute("aria-valuetext", "0.50");
    expect(slider).toHaveAttribute("aria-keyshortcuts", "Enter");
    expect(container.querySelector('[data-slot="scrubber-value"]')).toHaveTextContent("0.50");
    expect(container.querySelector('[data-slot="scrubber-fill"]')).toHaveStyle({
      width: "50%",
    });
  });

  it("renders the requested number of ticks", () => {
    const { container, rerender } = render(<Scrubber ticks={4} />);
    expect(container.querySelectorAll('[data-slot="scrubber-tick"]')).toHaveLength(4);
    rerender(<Scrubber ticks={0} />);
    expect(container.querySelectorAll('[data-slot="scrubber-tick"]')).toHaveLength(0);
  });

  it("sets the value from the pointer and follows a drag", () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    render(
      <Scrubber label="Opacity" onValueChange={onValueChange} onValueCommit={onValueCommit} />,
    );
    const slider = screen.getByRole("slider");
    mockRect(slider);

    fireEvent.pointerMove(slider, { clientX: 20, pointerId: 1 });
    expect(onValueChange).not.toHaveBeenCalled();

    fireEvent.pointerDown(slider, { clientX: 100, pointerId: 1, button: 0 });
    expect(onValueChange).toHaveBeenLastCalledWith(0.5);
    expect(slider).toHaveAttribute("data-dragging");
    fireEvent.pointerMove(slider, { clientX: 999, pointerId: 1 });
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    fireEvent.pointerMove(slider, { clientX: -50, pointerId: 1 });
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    fireEvent.pointerUp(slider, { pointerId: 1 });
    expect(slider).not.toHaveAttribute("data-dragging");
    expect(onValueCommit).toHaveBeenCalledExactlyOnceWith(0);
    expect(slider).toHaveAttribute("aria-valuenow", "0");

    fireEvent.pointerCancel(slider, { pointerId: 1 });
    expect(onValueCommit).toHaveBeenCalledTimes(1);
  });

  it("measures from the inline end in right-to-left layouts", () => {
    render(<Scrubber label="Opacity" dir="rtl" />);
    const slider = screen.getByRole("slider");
    mockRect(slider);
    fireEvent.pointerDown(slider, { clientX: 50, pointerId: 1, button: 0 });
    expect(slider).toHaveAttribute("aria-valuenow", "0.75");
  });

  it("ignores secondary buttons and an unmeasured track", () => {
    render(<Scrubber label="Opacity" defaultValue={0.3} />);
    const slider = screen.getByRole("slider");
    fireEvent.pointerDown(slider, { clientX: 50, pointerId: 1, button: 2 });
    expect(slider).not.toHaveAttribute("data-dragging");
    // jsdom's zero-width rect: the value stays where it was.
    fireEvent.pointerDown(slider, { clientX: 50, pointerId: 1, button: 0 });
    expect(slider).toHaveAttribute("aria-valuenow", "0.3");
  });

  it("steps from the keyboard", async () => {
    const user = userEvent.setup();
    const onValueCommit = vi.fn();
    render(
      <Scrubber
        label="Rotation"
        min={0}
        max={360}
        step={1}
        defaultValue={45}
        onValueCommit={onValueCommit}
      />,
    );
    const slider = screen.getByRole("slider");
    await user.tab();
    expect(slider).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuenow", "46");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(slider).toHaveAttribute("aria-valuenow", "44");
    await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(slider).toHaveAttribute("aria-valuenow", "54");
    await user.keyboard("{PageDown}{ArrowLeft}");
    expect(slider).toHaveAttribute("aria-valuenow", "43");
    await user.keyboard("{PageUp}");
    expect(slider).toHaveAttribute("aria-valuenow", "53");
    await user.keyboard("{End}");
    expect(slider).toHaveAttribute("aria-valuenow", "360");
    await user.keyboard("{Home}");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    await user.keyboard("{ArrowLeft}");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    await user.keyboard("x");
    expect(onValueCommit).toHaveBeenLastCalledWith(0);
  });

  it("reverses Left and Right in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(<Scrubber label="Scale" dir="rtl" min={0} max={3} step={0.1} defaultValue={1.5} />);
    const slider = screen.getByRole("slider");
    slider.focus();
    await user.keyboard("{ArrowLeft}");
    expect(slider).toHaveAttribute("aria-valuenow", "1.6");
  });

  it("takes a typed value on Enter and returns focus to the slider", async () => {
    const user = userEvent.setup();
    const onValueCommit = vi.fn();
    render(
      <Scrubber
        label="Scale"
        min={0}
        max={3}
        step={0.1}
        defaultValue={1.5}
        onValueCommit={onValueCommit}
      />,
    );
    const slider = screen.getByRole("slider");
    slider.focus();
    await user.keyboard("{Enter}");
    const input = screen.getByRole("textbox", { name: "Scale" });
    expect(input).toHaveFocus();
    expect(input).toHaveValue("1.5");

    await user.keyboard("2,34{Enter}");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(slider).toHaveFocus();
    expect(slider).toHaveAttribute("aria-valuenow", "2.3");
    expect(onValueCommit).toHaveBeenCalledExactlyOnceWith(2.3);
  });

  it("clamps typed values and ignores ones that are not numbers", async () => {
    const user = userEvent.setup();
    render(<Scrubber label="Opacity" defaultValue={0.4} />);
    const slider = screen.getByRole("slider");
    slider.focus();
    await user.keyboard("{Enter}");
    await user.keyboard("7{Enter}");
    expect(slider).toHaveAttribute("aria-valuenow", "1");
    await user.keyboard("{Enter}");
    await user.keyboard("abc{Enter}");
    expect(slider).toHaveAttribute("aria-valuenow", "1");
  });

  it("cancels a typed value on Escape", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Scrubber label="Opacity" defaultValue={0.4} onValueChange={onValueChange} />);
    const slider = screen.getByRole("slider");
    await user.dblClick(slider);
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.keyboard("0.9{Escape}");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(slider).toHaveFocus();
    expect(slider).toHaveAttribute("aria-valuenow", "0.4");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("commits a typed value when focus leaves the field", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Scrubber label="Opacity" defaultValue={0.4} />
        <button type="button">Elsewhere</button>
      </>,
    );
    const slider = screen.getByRole("slider");
    slider.focus();
    await user.keyboard("{Enter}");
    const input = screen.getByRole("textbox");
    fireEvent.pointerDown(slider, { clientX: 50, pointerId: 1, button: 0 });
    await user.type(input, "0.25", { initialSelectionStart: 0, initialSelectionEnd: 10 });
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(slider).toHaveAttribute("aria-valuenow", "0.25");
  });

  it("does not open the field when not editable", async () => {
    const user = userEvent.setup();
    render(<Scrubber label="Opacity" editable={false} />);
    const slider = screen.getByRole("slider");
    expect(slider).not.toHaveAttribute("aria-keyshortcuts");
    slider.focus();
    await user.keyboard("{Enter}");
    await user.dblClick(slider);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState(10);
      return (
        <>
          <Scrubber
            label="Size"
            min={0}
            max={100}
            step={1}
            value={value}
            onValueChange={setValue}
            formatValue={(v) => `${String(v)}px`}
          />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuetext", "10px");
    slider.focus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("status")).toHaveTextContent("11");
    expect(slider).toHaveAttribute("aria-valuetext", "11px");
  });

  it("keeps the prop value when controlled and not updated", () => {
    const onValueChange = vi.fn();
    render(<Scrubber label="Opacity" value={0.2} onValueChange={onValueChange} />);
    const slider = screen.getByRole("slider");
    mockRect(slider);
    fireEvent.pointerDown(slider, { clientX: 200, pointerId: 1, button: 0 });
    expect(onValueChange).toHaveBeenCalledWith(1);
    expect(slider).toHaveAttribute("aria-valuenow", "0.2");
  });

  it("does nothing when disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Scrubber label="Opacity" disabled onValueChange={onValueChange} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-disabled", "true");
    expect(slider).toHaveAttribute("tabindex", "-1");
    slider.focus();
    await user.keyboard("{ArrowRight}{Enter}");
    mockRect(slider);
    fireEvent.pointerDown(slider, { clientX: 100, pointerId: 1, button: 0 });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("derives decimals from the step, and honours an explicit count", () => {
    render(<Scrubber label="Fine" step={1e-7} max={1} defaultValue={0} />);
    expect(screen.getByRole("slider", { name: "Fine" })).toHaveAttribute(
      "aria-valuetext",
      "0.0000000",
    );
    render(<Scrubber label="Coarse" step={1} max={10} decimals={1} defaultValue={3} />);
    expect(screen.getByRole("slider", { name: "Coarse" })).toHaveAttribute(
      "aria-valuetext",
      "3.0",
    );
    render(<Scrubber label="Empty" min={5} max={5} />);
    expect(screen.getByRole("slider", { name: "Empty" })).toHaveAttribute("aria-valuenow", "5");
  });

  it("uses aria-label or aria-labelledby over the visible label", () => {
    render(
      <>
        <span id="external">Layer opacity</span>
        <Scrubber label="Opacity" aria-labelledby="external" aria-describedby="external" />
        <Scrubber label="Blur" aria-label="Background blur" aria-valuetext="soft" />
      </>,
    );
    expect(screen.getByRole("slider", { name: "Layer opacity" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Background blur" })).toHaveAttribute(
      "aria-valuetext",
      "soft",
    );
  });

  it("submits its value with a form", () => {
    const { container } = render(
      <Scrubber label="Opacity" name="opacity" defaultValue={0.3} />,
    );
    expect(container.querySelector('input[name="opacity"]')).toHaveValue("0.3");
  });

  it("applies the size variant, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Scrubber ref={ref} size="lg" className="h-12" data-testid="root" />);
    const root = screen.getByTestId("root");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("h-12", "text-sm");
    expect(root).not.toHaveClass("h-11");
  });

  it("has no accessibility violations, including while typing", async () => {
    const user = userEvent.setup();
    const { container } = render(<Scrubber label="Opacity" defaultValue={0.4} />);
    await expectNoA11yViolations(container);
    screen.getByRole("slider").focus();
    await user.keyboard("{Enter}");
    await expectNoA11yViolations(container);
  });
});
