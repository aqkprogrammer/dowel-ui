import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DurationPicker, type DurationValue } from "./duration-picker";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const root = () => document.querySelector<HTMLElement>('[data-slot="duration-picker"]')!;
const hours = () => screen.getByRole("textbox", { name: "Hours" });
const minutes = () => screen.getByRole("textbox", { name: "Minutes" });
const segment = (field: string) =>
  document.querySelector<HTMLElement>(
    `[data-slot="duration-picker-segment"][data-field="${field}"]`,
  )!;
const TWO_THIRTY: DurationValue = { hours: 2, minutes: 30 };

function mockMedia(reduced: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduced && query.includes("reduce"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

describe("DurationPicker", () => {
  it("shows the duration as one named pill with an edit button", () => {
    render(<DurationPicker defaultValue={TWO_THIRTY} />);
    const group = screen.getByRole("group", { name: "Duration" });
    expect(group).toHaveTextContent("2 hr 30 min");
    expect(group).not.toHaveAttribute("data-editing");
    expect(screen.getByRole("button", { name: "Edit duration" })).toHaveAttribute(
      "data-state",
      "edit",
    );
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(segment("hours")).toHaveClass("rounded-e-none");
    expect(segment("minutes")).toHaveClass("rounded-none");
    const goo = document.querySelector('[data-slot="duration-picker-goo"]');
    expect(goo).toHaveAttribute("aria-hidden", "true");
    expect(goo?.querySelectorAll('[data-slot="duration-picker-blob"]')).toHaveLength(3);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("springs apart into labelled numeric fields and focuses the hours", async () => {
    const user = userEvent.setup();
    const onEditingChange = vi.fn();
    render(<DurationPicker defaultValue={TWO_THIRTY} onEditingChange={onEditingChange} />);
    await user.click(screen.getByRole("button", { name: "Edit duration" }));
    expect(onEditingChange).toHaveBeenCalledWith(true);
    expect(root()).toHaveAttribute("data-editing");
    expect(hours()).toHaveFocus();
    expect(hours()).toHaveValue("2");
    expect(hours()).toHaveAttribute("inputmode", "numeric");
    expect(hours()).toHaveAttribute("maxlength", "2");
    expect(minutes()).toHaveValue("30");
    expect(segment("hours")).toHaveClass("translate-x-0", "rounded-[var(--dp-radius)]");
    const tick = screen.getByRole("button", { name: "Confirm duration" });
    expect(tick).toHaveAttribute("data-state", "confirm");
  });

  it("opens from the keyboard", async () => {
    const user = userEvent.setup();
    render(<DurationPicker />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(hours()).toHaveFocus();
    await user.tab();
    expect(minutes()).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Confirm duration" })).toHaveFocus();
  });

  it("reports every keystroke and confirms with the tick", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onConfirm = vi.fn();
    render(
      <DurationPicker
        defaultValue={TWO_THIRTY}
        onValueChange={onValueChange}
        onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit duration" }));
    await user.keyboard("1");
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 1, minutes: 30 });
    await user.keyboard("2");
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 12, minutes: 30 });
    await user.clear(minutes());
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 12, minutes: 0 });
    expect(minutes()).toHaveValue("");
    await user.type(minutes(), "05");
    expect(minutes()).toHaveValue("05");
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 12, minutes: 5 });

    const tick = screen.getByRole("button", { name: "Confirm duration" });
    await user.click(tick);
    expect(onConfirm).toHaveBeenCalledWith({ hours: 12, minutes: 5 });
    expect(root()).not.toHaveAttribute("data-editing");
    expect(root()).toHaveTextContent("12 hr 5 min");
    expect(screen.getByRole("button", { name: "Edit duration" })).toHaveFocus();
  });

  it("ignores anything but digits", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<DurationPicker defaultEditing onValueChange={onValueChange} />);
    await user.type(hours(), "{Backspace}a-");
    expect(hours()).toHaveValue("");
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 0, minutes: 0 });
  });

  it("clamps past the ceiling, shakes that field and announces the maximum", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<DurationPicker defaultValue={TWO_THIRTY} onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Edit duration" }));
    expect(segment("hours")).not.toHaveAttribute("data-shake");
    await user.keyboard("30");
    expect(hours()).toHaveValue("24");
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 24, minutes: 30 });
    expect(segment("hours")).toHaveAttribute("data-shake", "a");
    const blobs = document.querySelectorAll('[data-slot="duration-picker-blob"]');
    expect(blobs[0]).toHaveAttribute("data-shake", "a");
    expect(screen.getByRole("status")).toHaveTextContent("Maximum 24");

    await user.clear(hours());
    await user.keyboard("99");
    expect(segment("hours")).toHaveAttribute("data-shake", "b");
    expect(screen.getByRole("status").textContent).not.toBe("Maximum 24");
    expect(screen.getByRole("status")).toHaveTextContent("Maximum 24");

    await user.clear(minutes());
    await user.type(minutes(), "75");
    expect(minutes()).toHaveValue("59");
    expect(segment("minutes")).toHaveAttribute("data-shake", "a");
    expect(blobs[1]).toHaveAttribute("data-shake", "a");
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 24, minutes: 59 });
  });

  it("honours custom ceilings", async () => {
    const user = userEvent.setup();
    render(<DurationPicker defaultEditing maxHours={168} maxMinutes={30} />);
    expect(hours()).toHaveAttribute("maxlength", "3");
    await user.type(hours(), "{Backspace}200");
    expect(hours()).toHaveValue("168");
    await user.type(minutes(), "{Backspace}45");
    expect(minutes()).toHaveValue("30");
  });

  it("confirms with Enter in a field", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DurationPicker defaultValue={TWO_THIRTY} onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Edit duration" }));
    await user.keyboard("4{Enter}");
    expect(onConfirm).toHaveBeenCalledWith({ hours: 4, minutes: 30 });
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Edit duration" })).toHaveFocus();
  });

  it("reverts with Escape", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onConfirm = vi.fn();
    const onEditingChange = vi.fn();
    render(
      <DurationPicker
        defaultValue={TWO_THIRTY}
        onValueChange={onValueChange}
        onConfirm={onConfirm}
        onEditingChange={onEditingChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit duration" }));
    await user.keyboard("9");
    await user.tab();
    await user.keyboard("{Backspace}{Backspace}15{Escape}");
    expect(onValueChange).toHaveBeenLastCalledWith(TWO_THIRTY);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onEditingChange).toHaveBeenLastCalledWith(false);
    expect(root()).toHaveTextContent("2 hr 30 min");
    expect(screen.getByRole("button", { name: "Edit duration" })).toHaveFocus();
  });

  it("closes on Escape from the tick without reporting an unchanged value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<DurationPicker defaultValue={TWO_THIRTY} onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Edit duration" }));
    screen.getByRole("button", { name: "Confirm duration" }).focus();
    await user.keyboard("{Escape}");
    expect(root()).not.toHaveAttribute("data-editing");
    expect(onValueChange).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(root()).not.toHaveAttribute("data-editing");
  });

  it("follows a controlled value and only requests changes", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <DurationPicker value={TWO_THIRTY} onValueChange={onValueChange} defaultEditing />,
    );
    fireEvent.change(hours(), { target: { value: "7" } });
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 7, minutes: 30 });
    expect(hours()).toHaveValue("2");
    rerender(
      <DurationPicker
        value={{ hours: 7, minutes: 45 }}
        onValueChange={onValueChange}
        defaultEditing
      />,
    );
    expect(hours()).toHaveValue("7");
    expect(minutes()).toHaveValue("45");
  });

  it("works as a controlled pair with state", async () => {
    function Controlled() {
      const [value, setValue] = useState<DurationValue>({ hours: 1, minutes: 0 });
      const [editing, setEditing] = useState(false);
      return (
        <>
          <DurationPicker
            value={value}
            onValueChange={setValue}
            editing={editing}
            onEditingChange={setEditing}
          />
          <output>{`${String(value.hours)}:${String(value.minutes)}`}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Edit duration" }));
    expect(hours()).toHaveFocus();
    await user.keyboard("3");
    await user.click(minutes());
    await user.keyboard("20");
    expect(document.querySelector("output")).toHaveTextContent("3:20");
    await user.click(screen.getByRole("button", { name: "Confirm duration" }));
    expect(root()).toHaveTextContent("3 hr 20 min");
  });

  it("only requests edit mode when it is controlled, and hands focus back when closed", async () => {
    const user = userEvent.setup();
    const onEditingChange = vi.fn();
    const { rerender } = render(
      <DurationPicker editing={false} onEditingChange={onEditingChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Edit duration" }));
    expect(onEditingChange).toHaveBeenCalledWith(true);
    expect(root()).not.toHaveAttribute("data-editing");

    rerender(<DurationPicker editing onEditingChange={onEditingChange} />);
    expect(hours()).toHaveFocus();
    rerender(<DurationPicker editing={false} onEditingChange={onEditingChange} />);
    expect(screen.getByRole("button", { name: "Edit duration" })).toHaveFocus();
  });

  it("can start open without taking focus", () => {
    render(<DurationPicker defaultEditing />);
    expect(root()).toHaveAttribute("data-editing");
    expect(hours()).not.toHaveFocus();
  });

  it("stays shut and inert when disabled", async () => {
    const user = userEvent.setup();
    const onEditingChange = vi.fn();
    render(<DurationPicker disabled defaultEditing onEditingChange={onEditingChange} />);
    expect(root()).toHaveAttribute("data-disabled");
    expect(root()).not.toHaveAttribute("data-editing");
    const pen = screen.getByRole("button", { name: "Edit duration" });
    expect(pen).toBeDisabled();
    await user.click(pen);
    expect(onEditingChange).not.toHaveBeenCalled();
  });

  it("takes units, labels and a labelling element", async () => {
    const user = userEvent.setup();
    render(
      <>
        <span id="cook">Cooking time</span>
        <DurationPicker
          aria-labelledby="cook"
          defaultValue={{ hours: 1, minutes: 5 }}
          hoursLabel="h"
          minutesLabel="m"
          labels={{
            hours: "Stunden",
            minutes: "Minuten",
            edit: "Bearbeiten",
            confirm: "Bestätigen",
            maximum: "Höchstens",
          }}
        />
      </>,
    );
    expect(screen.getByRole("group", { name: "Cooking time" })).toHaveTextContent("1 h 5 m");
    await user.click(screen.getByRole("button", { name: "Bearbeiten" }));
    expect(screen.getByRole("textbox", { name: "Stunden" })).toHaveFocus();
    await user.keyboard("40");
    expect(screen.getByRole("status")).toHaveTextContent("Höchstens 24");
    expect(screen.getByRole("textbox", { name: "Minuten" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bestätigen" })).toBeInTheDocument();
  });

  it("melts with an SVG goo filter when supported, and not under reduced motion", () => {
    vi.stubGlobal("CSS", { supports: () => true });
    mockMedia(false);
    const { unmount } = render(<DurationPicker />);
    const goo = document.querySelector<HTMLElement>('[data-slot="duration-picker-goo"]')!;
    const filter = document.querySelector("filter");
    expect(filter).toBeInTheDocument();
    expect(goo.style.filter).toContain(`#${String(filter?.id)}`);
    unmount();

    mockMedia(true);
    render(<DurationPicker />);
    expect(document.querySelector("filter")).toBeNull();
    expect(
      document.querySelector<HTMLElement>('[data-slot="duration-picker-goo"]')!.style.filter,
    ).toBe("");
  });

  it("clamps an out-of-range value it is given", () => {
    render(<DurationPicker value={{ hours: 30, minutes: -4 }} />);
    expect(root()).toHaveTextContent("24 hr 0 min");
  });

  it("sizes the pill", () => {
    const { rerender } = render(<DurationPicker size="sm" />);
    expect(root()).toHaveClass("h-8");
    rerender(<DurationPicker />);
    expect(root()).toHaveClass("h-10");
    rerender(<DurationPicker size="lg" />);
    expect(root()).toHaveClass("h-12");
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    const onKeyDown = vi.fn();
    render(
      <DurationPicker ref={ref} className="h-14" data-testid="picker" onKeyDown={onKeyDown} />,
    );
    const picker = screen.getByTestId("picker");
    expect(ref.current).toBe(picker);
    expect(picker).toHaveClass("h-14");
    expect(picker).not.toHaveClass("h-10");
    fireEvent.keyDown(screen.getByRole("button"), { key: "x" });
    expect(onKeyDown).toHaveBeenCalledOnce();
  });

  it("has no accessibility violations shut or open", async () => {
    const user = userEvent.setup();
    const { container } = render(<DurationPicker defaultValue={TWO_THIRTY} />);
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Edit duration" }));
    await user.keyboard("40");
    await expectNoA11yViolations(container);
  });
});
