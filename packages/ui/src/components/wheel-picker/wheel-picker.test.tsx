import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { WheelPicker, type WheelPickerOption } from "./wheel-picker";

const FRUIT: WheelPickerOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry", disabled: true },
  { value: "date", label: "Date" },
  { value: "elder", label: "Elderberry" },
  { value: "fig", label: "Fig" },
];

function listbox() {
  return screen.getByRole("listbox", { name: "Fruit" });
}

function selectedLabel() {
  return screen.getByRole("option", { selected: true }).textContent;
}

describe("WheelPicker", () => {
  it("is a named listbox whose active descendant is the selected option", () => {
    render(<WheelPicker aria-label="Fruit" options={FRUIT} defaultValue="banana" />);
    const box = listbox();
    const active = document.getElementById(box.getAttribute("aria-activedescendant") ?? "");
    expect(active).toHaveTextContent("Banana");
    expect(active).toHaveAttribute("aria-selected", "true");
  });

  it("starts on the first enabled option without a default", () => {
    render(<WheelPicker aria-label="Fruit" options={FRUIT} />);
    expect(selectedLabel()).toBe("Apple");
  });

  it("moves with the arrow keys, skipping disabled options", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <WheelPicker
        aria-label="Fruit"
        options={FRUIT}
        defaultValue="banana"
        onValueChange={onValueChange}
      />,
    );
    listbox().focus();
    await user.keyboard("{ArrowDown}");
    expect(selectedLabel()).toBe("Date");
    expect(onValueChange).toHaveBeenLastCalledWith("date");
    await user.keyboard("{ArrowUp}");
    expect(selectedLabel()).toBe("Banana");
  });

  it("keeps quick presses when an interrupted scroll rests between rows", () => {
    vi.useFakeTimers();
    try {
      render(<WheelPicker aria-label="Fruit" options={FRUIT} />);
      const box = listbox();
      const viewport = box.querySelector<HTMLElement>('[data-slot="wheel-picker-viewport"]')!;
      box.focus();
      fireEvent.keyDown(box, { key: "ArrowDown" });
      fireEvent.keyDown(box, { key: "ArrowDown" });
      fireEvent.keyDown(box, { key: "ArrowDown" });
      expect(selectedLabel()).toBe("Elderberry");

      // The smooth scroll was cut short and snapped to Banana's row.
      const row = viewport.scrollTop / 4;
      viewport.scrollTop = row;
      fireEvent.scroll(viewport);
      vi.advanceTimersByTime(200);

      expect(selectedLabel()).toBe("Elderberry");
      expect(viewport.scrollTop).toBe(row * 4);
    } finally {
      vi.useRealTimers();
    }
  });

  it("jumps with Home, End and Page keys", async () => {
    const user = userEvent.setup();
    render(<WheelPicker aria-label="Fruit" options={FRUIT} visibleCount={3} />);
    listbox().focus();
    await user.keyboard("{End}");
    expect(selectedLabel()).toBe("Fig");
    await user.keyboard("{Home}");
    expect(selectedLabel()).toBe("Apple");
    await user.keyboard("{PageDown}");
    // Two rows on, onto the disabled Cherry, so the nearest enabled one.
    expect(selectedLabel()).toBe("Date");
  });

  it("finds options by typing", async () => {
    const user = userEvent.setup();
    render(<WheelPicker aria-label="Fruit" options={FRUIT} />);
    listbox().focus();
    await user.keyboard("el");
    expect(selectedLabel()).toBe("Elderberry");
  });

  it("selects an option that is clicked", async () => {
    const user = userEvent.setup();
    render(<WheelPicker aria-label="Fruit" options={FRUIT} />);
    await user.click(screen.getByRole("option", { name: "Fig" }));
    expect(selectedLabel()).toBe("Fig");
  });

  it("commits the row it settles on after scrolling", () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    const { container } = render(
      <WheelPicker
        aria-label="Fruit"
        options={FRUIT}
        size="md"
        onValueChange={onValueChange}
      />,
    );
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="wheel-picker-viewport"]',
    )!;
    viewport.scrollTop = 40 * 4;
    fireEvent.scroll(viewport);
    vi.advanceTimersByTime(200);
    expect(onValueChange).toHaveBeenCalledWith("elder");
    vi.useRealTimers();
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState("fig");
      return (
        <>
          <WheelPicker
            aria-label="Fruit"
            options={FRUIT}
            value={value}
            onValueChange={setValue}
          />
          <button type="button" onClick={() => setValue("apple")}>
            Reset
          </button>
        </>
      );
    }
    render(<Controlled />);
    expect(selectedLabel()).toBe("Fig");
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(selectedLabel()).toBe("Apple");
  });

  it("submits through a hidden input and ignores keys when disabled", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <WheelPicker
        aria-label="Fruit"
        options={FRUIT}
        name="fruit"
        defaultValue="date"
        disabled
      />,
    );
    expect(container.querySelector('input[type="hidden"]')).toHaveValue("date");
    expect(listbox()).toHaveAttribute("aria-disabled", "true");
    listbox().focus();
    await user.keyboard("{ArrowDown}");
    expect(selectedLabel()).toBe("Date");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<WheelPicker aria-label="Fruit" options={FRUIT} />);
    await expectNoA11yViolations(container);
  });
});
