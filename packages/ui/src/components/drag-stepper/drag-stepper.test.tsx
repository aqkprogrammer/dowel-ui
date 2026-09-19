import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DirectionProvider } from "@/components/direction";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DragStepper } from "./drag-stepper";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const spin = () => screen.getByRole("spinbutton");
const root = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-slot=drag-stepper]")!;

function move(clientX: number) {
  fireEvent(window, new MouseEvent("pointermove", { clientX, bubbles: true }));
}
function release() {
  fireEvent(window, new MouseEvent("pointerup", { bubbles: true }));
}

describe("DragStepper", () => {
  it("is a named spinbutton with its value and bounds", () => {
    render(<DragStepper aria-label="Quantity" />);
    expect(spin()).toHaveAccessibleName("Quantity");
    expect(spin()).toHaveAttribute("aria-valuenow", "24");
    expect(spin()).toHaveAttribute("aria-valuemin", "0");
    expect(spin()).toHaveAttribute("aria-valuemax", "100");
    expect(spin()).toHaveAttribute("inputmode", "numeric");
    expect(spin()).toHaveValue("24");
  });

  it("speaks formatted values", () => {
    render(
      <DragStepper aria-label="Guests" defaultValue={3} formatValue={(v) => `${v} guests`} />,
    );
    expect(spin()).toHaveAttribute("aria-valuetext", "3 guests");
  });

  it("steps with arrows, pages and jumps with Home and End", async () => {
    const user = userEvent.setup();
    render(<DragStepper aria-label="Quantity" />);
    await user.click(spin());
    await user.keyboard("{ArrowUp}");
    expect(spin()).toHaveAttribute("aria-valuenow", "25");
    await user.keyboard("{ArrowRight}");
    expect(spin()).toHaveAttribute("aria-valuenow", "26");
    await user.keyboard("{ArrowDown}{ArrowLeft}");
    expect(spin()).toHaveAttribute("aria-valuenow", "24");
    await user.keyboard("{PageUp}");
    expect(spin()).toHaveAttribute("aria-valuenow", "34");
    await user.keyboard("{PageDown}{PageDown}");
    expect(spin()).toHaveAttribute("aria-valuenow", "14");
    await user.keyboard("{End}");
    expect(spin()).toHaveAttribute("aria-valuenow", "100");
    await user.keyboard("{ArrowUp}");
    expect(spin()).toHaveAttribute("aria-valuenow", "100");
    await user.keyboard("{Home}");
    expect(spin()).toHaveAttribute("aria-valuenow", "0");
  });

  it("honours largeStep and step", async () => {
    const user = userEvent.setup();
    render(<DragStepper aria-label="Q" defaultValue={0} step={0.5} largeStep={4} />);
    await user.click(spin());
    await user.keyboard("{ArrowUp}");
    expect(spin()).toHaveValue("0.5");
    await user.keyboard("{PageUp}");
    expect(spin()).toHaveAttribute("aria-valuenow", "2.5");
  });

  it("mirrors Left and Right in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider dir="rtl">
        <DragStepper aria-label="Quantity" />
      </DirectionProvider>,
    );
    await user.click(spin());
    await user.keyboard("{ArrowLeft}");
    expect(spin()).toHaveAttribute("aria-valuenow", "25");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(spin()).toHaveAttribute("aria-valuenow", "23");
  });

  it("commits typed values on Enter and blur, clamped, and reverts invalid ones", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<DragStepper aria-label="Quantity" onValueChange={onValueChange} />);
    await user.tripleClick(spin());
    await user.keyboard("42{Enter}");
    expect(spin()).toHaveAttribute("aria-valuenow", "42");
    expect(onValueChange).toHaveBeenLastCalledWith(42);

    await user.tripleClick(spin());
    await user.keyboard("500");
    // Left/Right move the caret while typing rather than stepping.
    await user.keyboard("{ArrowLeft}");
    expect(spin()).toHaveAttribute("aria-valuenow", "42");
    await user.tab();
    expect(spin()).toHaveAttribute("aria-valuenow", "100");

    await user.tripleClick(spin());
    await user.keyboard("abc{Enter}");
    expect(spin()).toHaveValue("100");
  });

  it("discards a draft on Escape", async () => {
    const user = userEvent.setup();
    render(<DragStepper aria-label="Quantity" />);
    await user.tripleClick(spin());
    await user.keyboard("7");
    expect(spin()).toHaveValue("7");
    await user.keyboard("{Escape}");
    expect(spin()).toHaveValue("24");
    await user.keyboard("{Escape}");
    expect(spin()).toHaveValue("24");
  });

  it("steps with the side buttons by pointer and keyboard", async () => {
    const user = userEvent.setup();
    render(<DragStepper aria-label="Quantity" defaultValue={1} max={3} />);
    const inc = screen.getByRole("button", { name: "Increase" });
    const dec = screen.getByRole("button", { name: "Decrease" });
    await user.click(inc);
    expect(spin()).toHaveAttribute("aria-valuenow", "2");
    inc.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(spin()).toHaveAttribute("aria-valuenow", "3");
    expect(inc).toHaveAttribute("aria-disabled", "true");
    await user.click(inc);
    expect(spin()).toHaveAttribute("aria-valuenow", "3");
    await user.click(dec);
    await user.click(dec);
    await user.click(dec);
    expect(spin()).toHaveAttribute("aria-valuenow", "0");
    expect(dec).toHaveAttribute("aria-disabled", "true");
    await user.click(dec);
    expect(spin()).toHaveAttribute("aria-valuenow", "0");
  });

  it("uses custom side button names", () => {
    render(<DragStepper aria-label="Q" decrementLabel="Fewer" incrementLabel="More" />);
    expect(screen.getByRole("button", { name: "Fewer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
  });

  it("enters sweep on hold, scrubs relatively, and does not also tap", () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    const { container } = render(
      <DragStepper aria-label="Quantity" onValueChange={onValueChange} />,
    );
    const inc = screen.getByRole("button", { name: "Increase" });
    fireEvent.pointerDown(inc, { button: 0, clientX: 100 });
    expect(root(container)).not.toHaveAttribute("data-sweep");
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(root(container)).toHaveAttribute("data-sweep");
    act(() => move(150));
    expect(spin()).toHaveAttribute("aria-valuenow", "54");
    act(() => move(-500));
    expect(spin()).toHaveAttribute("aria-valuenow", "0");
    act(() => move(80));
    expect(spin()).toHaveAttribute("aria-valuenow", "12");
    act(() => release());
    fireEvent.click(inc, { detail: 1 });
    expect(root(container)).not.toHaveAttribute("data-sweep");
    expect(spin()).toHaveAttribute("aria-valuenow", "12");
    // The next real click steps again.
    fireEvent.click(inc, { detail: 1 });
    expect(spin()).toHaveAttribute("aria-valuenow", "13");
  });

  it("scrubs the other way in right-to-left layouts", () => {
    vi.useFakeTimers();
    render(<DragStepper aria-label="Quantity" dir="rtl" sensitivity={1} />);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Decrease" }), {
      button: 0,
      clientX: 100,
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    act(() => move(90));
    expect(spin()).toHaveAttribute("aria-valuenow", "34");
    act(() => release());
  });

  it("treats a quick press as a tap, not a sweep", () => {
    vi.useFakeTimers();
    const { container, unmount } = render(<DragStepper aria-label="Quantity" />);
    const inc = screen.getByRole("button", { name: "Increase" });
    fireEvent.pointerDown(inc, { button: 0, clientX: 0 });
    act(() => move(200));
    act(() => release());
    fireEvent.click(inc, { detail: 1 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(root(container)).not.toHaveAttribute("data-sweep");
    expect(spin()).toHaveAttribute("aria-valuenow", "25");
    // Ignores other buttons, and cleans up a pending hold on unmount.
    fireEvent.pointerDown(inc, { button: 2 });
    fireEvent.pointerDown(inc, { button: 0 });
    unmount();
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState(10);
      return (
        <>
          <DragStepper aria-label="Quantity" value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Increase" }));
    expect(screen.getByRole("status")).toHaveTextContent("11");
  });

  it("stays put when controlled without a handler update", async () => {
    const user = userEvent.setup();
    render(<DragStepper aria-label="Quantity" value={5} />);
    await user.click(screen.getByRole("button", { name: "Increase" }));
    expect(spin()).toHaveAttribute("aria-valuenow", "5");
  });

  it("does nothing when disabled", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<DragStepper aria-label="Quantity" disabled onValueChange={onValueChange} />);
    expect(spin()).toBeDisabled();
    fireEvent.keyDown(spin(), { key: "ArrowUp" });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Increase" }), { button: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Increase" }));
    await user.click(screen.getByRole("button", { name: "Decrease" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("submits under a name", () => {
    const { container } = render(<DragStepper aria-label="Quantity" name="qty" />);
    expect(container.querySelector("input[type=hidden]")).toHaveAttribute("name", "qty");
    expect(container.querySelector("input[type=hidden]")).toHaveValue("24");
  });

  it("applies fill and stroke, and lets className win", () => {
    const { container } = render(
      <DragStepper aria-label="Q" fill="dark" stroke className="bg-primary" />,
    );
    expect(root(container)).toHaveClass("bg-primary");
    expect(root(container)).not.toHaveClass("bg-foreground");
    expect(root(container).className).toContain("inset_0_0_0_1px");
  });

  it("forwards its ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<DragStepper aria-label="Q" ref={ref} />);
    expect(ref.current).toHaveAttribute("data-slot", "drag-stepper");
  });

  it("warns in development when unnamed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<DragStepper />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[DragStepper]"));
  });

  it("has no axe violations", async () => {
    const { container } = render(<DragStepper aria-label="Quantity" />);
    await expectNoA11yViolations(container);
  });
});
