import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  DATA_UNITS,
  MASS_UNITS,
  QuantityInput,
  TEMPERATURE_UNITS,
  pickUnits,
  type Quantity,
  type QuantityInputProps,
} from "./quantity-input";

afterEach(() => {
  vi.restoreAllMocks();
});

const WEIGHT = pickUnits(MASS_UNITS, ["kg", "lb"]);

function renderWeight(props: Partial<QuantityInputProps> = {}) {
  return render(
    <QuantityInput
      label="Parcel weight"
      units={WEIGHT}
      defaultValue={{ amount: 2.5, unit: "kg" }}
      min={{ amount: 0, unit: "kg" }}
      max={{ amount: 30, unit: "kg" }}
      locale="en-US"
      {...props}
    />,
  );
}

const field = () => screen.getByRole("spinbutton");
const unitSelect = () => screen.getByRole("combobox");
const message = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-slot=quantity-input-message]")!;

async function retype(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.clear(field());
  if (text) await user.type(field(), text);
}

describe("QuantityInput", () => {
  it("writes numbers as en-US on the server, so hydration agrees in any browser", () => {
    const html = renderToString(
      <QuantityInput
        aria-label="Weight"
        units={MASS_UNITS}
        defaultValue={{ amount: 1234.5, unit: "kg" }}
      />,
    );
    expect(html).toContain('value="1,234.5"');
  });

  it("is a named spinbutton with its value, bounds and the unit spelled out", () => {
    renderWeight();
    expect(field()).toHaveAccessibleName("Parcel weight");
    expect(field()).toHaveValue("2.5");
    expect(field()).toHaveAttribute("aria-valuenow", "2.5");
    expect(field()).toHaveAttribute("aria-valuemin", "0");
    expect(field()).toHaveAttribute("aria-valuemax", "30");
    expect(field()).toHaveAttribute("aria-valuetext", "2.5 kilograms");
    expect(field()).toHaveAttribute("inputmode", "decimal");
    expect(screen.getByRole("group", { name: "Parcel weight" })).toBeInTheDocument();
    expect(unitSelect()).toHaveAccessibleName("Parcel weight unit");
    expect(unitSelect()).toHaveValue("kg");
  });

  it("speaks the singular where the locale's plural rules say one", () => {
    renderWeight({ defaultValue: { amount: 1, unit: "kg" } });
    expect(field()).toHaveAttribute("aria-valuetext", "1 kilogram");
  });

  it("steps with arrows, Shift+arrows and pages, and jumps with Home and End", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderWeight({ onValueChange });
    await user.click(field());
    await user.keyboard("{ArrowUp}");
    expect(field()).toHaveAttribute("aria-valuenow", "2.6");
    expect(onValueChange).toHaveBeenLastCalledWith({ amount: 2.6, unit: "kg" });
    await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(field()).toHaveAttribute("aria-valuenow", "3.6");
    await user.keyboard("{ArrowDown}{PageUp}");
    expect(field()).toHaveAttribute("aria-valuenow", "4.5");
    await user.keyboard("{PageDown}{PageDown}");
    expect(field()).toHaveAttribute("aria-valuenow", "2.5");
    await user.keyboard("{End}");
    expect(field()).toHaveValue("30");
    await user.keyboard("{ArrowUp}");
    expect(field()).toHaveAttribute("aria-valuenow", "30");
    await user.keyboard("{Home}{ArrowDown}");
    expect(field()).toHaveAttribute("aria-valuenow", "0");
  });

  it("moves an off-step value to the next step in that direction", async () => {
    const user = userEvent.setup();
    renderWeight({ defaultValue: { amount: 2.53, unit: "kg" } });
    await user.click(field());
    await user.keyboard("{ArrowUp}");
    expect(field()).toHaveValue("2.6");
    await user.keyboard("{ArrowDown}");
    expect(field()).toHaveValue("2.5");
  });

  it("leaves Home and End to the caret when there are no bounds", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderWeight({ min: undefined, max: undefined, onValueChange });
    expect(field()).toHaveAttribute("inputmode", "text");
    expect(field()).not.toHaveAttribute("aria-valuemin");
    await user.click(field());
    const notPrevented = fireEvent.keyDown(field(), { key: "Home" });
    expect(notPrevented).toBe(true);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("has named step buttons outside the Tab order that stop at the bounds", async () => {
    const user = userEvent.setup();
    renderWeight({ defaultValue: { amount: 29.9, unit: "kg" } });
    const increase = screen.getByRole("button", { name: "Increase by 0.1 kg" });
    const decrease = screen.getByRole("button", { name: "Decrease by 0.1 kg" });
    expect(increase).toHaveAttribute("tabindex", "-1");
    expect(decrease).toHaveAttribute("tabindex", "-1");

    await user.click(increase);
    expect(field()).toHaveAttribute("aria-valuenow", "30");
    expect(increase).toHaveAttribute("aria-disabled", "true");
    await user.click(increase);
    expect(field()).toHaveAttribute("aria-valuenow", "30");
    await user.click(decrease);
    expect(field()).toHaveAttribute("aria-valuenow", "29.9");

    await user.tab();
    expect(field()).toHaveFocus();
    await user.tab();
    expect(unitSelect()).toHaveFocus();
  });

  it("takes one step for every unit when step is set", async () => {
    const user = userEvent.setup();
    renderWeight({ step: 0.5 });
    expect(screen.getByRole("button", { name: "Increase by 0.5 kg" })).toBeInTheDocument();
    await user.selectOptions(unitSelect(), "lb");
    expect(screen.getByRole("button", { name: "Increase by 0.5 lb" })).toBeInTheDocument();
  });

  it("converts on a unit change, bounds included, and converts back exactly", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderWeight({ onValueChange });
    await user.selectOptions(unitSelect(), "lb");
    expect(field()).toHaveValue("5.51");
    expect(field()).toHaveAttribute("aria-valuetext", "5.51 pounds");
    expect(field()).toHaveAttribute("aria-valuemax", "66.13");
    expect(onValueChange).toHaveBeenLastCalledWith({ amount: 5.51, unit: "lb" });
    // 5.51 lb is 2.499 kg; the field remembers the 2.5 kg it started from.
    await user.selectOptions(unitSelect(), "kg");
    expect(field()).toHaveValue("2.5");
  });

  it("converts from the new value once it has been changed in the other unit", async () => {
    const user = userEvent.setup();
    renderWeight();
    await user.selectOptions(unitSelect(), "lb");
    await user.click(field());
    await user.keyboard("{ArrowUp}");
    expect(field()).toHaveValue("5.6");
    await user.selectOptions(unitSelect(), "kg");
    expect(field()).toHaveValue("2.54");
  });

  it("keeps the number when convertOnUnitChange is off, clamped to the bounds", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWeight({ convertOnUnitChange: false });
    await user.selectOptions(unitSelect(), "lb");
    expect(field()).toHaveValue("2.5");
    unmount();

    render(
      <QuantityInput
        aria-label="Load"
        units={pickUnits(MASS_UNITS, ["g", "kg"])}
        defaultValue={{ amount: 2000, unit: "g" }}
        max={{ amount: 5, unit: "kg" }}
        convertOnUnitChange={false}
        locale="en-US"
      />,
    );
    await user.selectOptions(unitSelect(), "kg");
    expect(field()).toHaveValue("5");
  });

  it("reads a typed unit and commits on blur or Enter, written for the locale", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderWeight({ onValueChange });
    await retype(user, "5 lb");
    expect(onValueChange).not.toHaveBeenCalled();
    await user.tab();
    expect(unitSelect()).toHaveValue("lb");
    expect(field()).toHaveValue("5");
    expect(onValueChange).toHaveBeenLastCalledWith({ amount: 5, unit: "lb" });

    await retype(user, "12.00{Enter}");
    expect(field()).toHaveValue("12");
    expect(field()).toHaveAttribute("aria-valuetext", "12 pounds");
  });

  it("reads and writes numbers the German way", async () => {
    const user = userEvent.setup();
    render(
      <QuantityInput
        label="Mehl"
        units={pickUnits(MASS_UNITS, ["g", "kg"])}
        defaultValue={{ amount: 2.5, unit: "g" }}
        locale="de-DE"
      />,
    );
    expect(field()).toHaveValue("2,5");
    await retype(user, "1234,5");
    await user.tab();
    expect(field()).toHaveValue("1.234,5");
    expect(field()).toHaveAttribute("aria-valuenow", "1234.5");
    await retype(user, "1,5 kg");
    await user.tab();
    expect(field()).toHaveAttribute("aria-valuenow", "1.5");
    await retype(user, "abc");
    await user.tab();
    expect(screen.getByText("Enter a number, like 1,5.")).toBeInTheDocument();
  });

  it("shows why text cannot be read, keeps it and the last good value, and names the error", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    const { container } = renderWeight({ onValueChange });
    await retype(user, "abc");
    expect(field()).not.toHaveAttribute("aria-invalid");
    await user.tab();

    expect(message(container)).toHaveAttribute("aria-live", "polite");
    expect(message(container)).toHaveTextContent("Enter a number, like 1.5.");
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAccessibleDescription("Enter a number, like 1.5.");
    expect(field()).toHaveValue("abc");
    expect(field()).toHaveAttribute("aria-valuenow", "2.5");
    expect((field() as HTMLInputElement).validity.customError).toBe(true);
    expect(container.querySelector("[data-slot=quantity-input-control]")).toHaveAttribute(
      "data-invalid",
    );
    expect(onValueChange).not.toHaveBeenCalled();

    // Fixing the text clears the error before blur; a new one waits for it.
    await user.clear(field());
    expect(field()).toHaveAttribute("aria-invalid", "true");
    await user.type(field(), "3");
    expect(field()).not.toHaveAttribute("aria-invalid");
    expect(message(container)).toBeEmptyDOMElement();
    await user.tab();
    expect(field()).toHaveAttribute("aria-valuenow", "3");
    expect((field() as HTMLInputElement).validity.customError).toBe(false);
  });

  it.each([
    ["", "Enter an amount."],
    ["5 st", "“st” is not a unit this field takes. Use kg or lb."],
    ["45", "Enter 30 kg or less."],
    ["-1", "Enter 0 kg or more."],
    ["100 lb", "Enter 66.13 lb or less."],
  ])("explains %j", async (text, expected) => {
    const user = userEvent.setup();
    const { container } = renderWeight();
    await retype(user, text);
    await user.tab();
    expect(message(container)).toHaveTextContent(expected);
    expect(field()).toHaveAttribute("aria-valuenow", "2.5");
  });

  it("discards text on Escape, and lets Escape through when there is none", async () => {
    const user = userEvent.setup();
    const { container } = renderWeight();
    await retype(user, "abc");
    await user.tab();
    await user.click(field());
    await user.keyboard("{Escape}");
    expect(field()).toHaveValue("2.5");
    expect(message(container)).toBeEmptyDOMElement();
    expect(fireEvent.keyDown(field(), { key: "Escape" })).toBe(true);
  });

  it("holds Enter back from the form while the text cannot be read", async () => {
    const user = userEvent.setup();
    renderWeight();
    await retype(user, "abc");
    expect(fireEvent.keyDown(field(), { key: "Enter" })).toBe(false);
    await retype(user, "4");
    expect(fireEvent.keyDown(field(), { key: "Enter" })).toBe(true);
    expect(field()).toHaveAttribute("aria-valuenow", "4");
  });

  it("steps from typed text that has not been committed yet", async () => {
    const user = userEvent.setup();
    renderWeight();
    await retype(user, "7 lb");
    await user.keyboard("{ArrowUp}");
    expect(unitSelect()).toHaveValue("lb");
    expect(field()).toHaveValue("7.1");
  });

  it("takes a pasted quantity with a unit at once, and a bare number on blur", async () => {
    const user = userEvent.setup();
    renderWeight();
    await user.tripleClick(field());
    await user.paste("4 lb");
    expect(unitSelect()).toHaveValue("lb");
    expect(field()).toHaveAttribute("aria-valuenow", "4");

    await user.tripleClick(field());
    await user.paste("7");
    expect(field()).toHaveValue("7");
    expect(field()).toHaveAttribute("aria-valuenow", "4");
  });

  it("submits the amount and the unit with a form", async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(
      <form>
        <QuantityInput label="Weight" units={WEIGHT} locale="en-US" name="weight" />
      </form>,
    );
    const form = () => container.querySelector("form")!;
    expect(new FormData(form()).get("weight")).toBe("0");
    expect(new FormData(form()).get("weightUnit")).toBe("kg");
    await retype(user, "5");
    await user.selectOptions(unitSelect(), "lb");
    expect(new FormData(form()).get("weight")).toBe("11.02");
    expect(new FormData(form()).get("weightUnit")).toBe("lb");

    rerender(
      <form>
        <QuantityInput
          label="Weight"
          units={WEIGHT}
          locale="en-US"
          name="weight"
          unitName="weight_unit"
          disabled
        />
      </form>,
    );
    expect([...new FormData(form()).keys()]).toEqual([]);
  });

  it("goes back to its default when the form resets", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <QuantityInput
          label="Weight"
          units={WEIGHT}
          defaultValue={{ amount: 2.5, unit: "kg" }}
          locale="en-US"
        />
      </form>,
    );
    await user.selectOptions(unitSelect(), "lb");
    expect(field()).toHaveValue("5.51");
    act(() => {
      container.querySelector("form")!.reset();
    });
    expect(field()).toHaveValue("2.5");
    expect(unitSelect()).toHaveValue("kg");
  });

  it("works controlled, and treats a new value from outside as the new starting point", async () => {
    function Harness() {
      const [value, setValue] = useState<Quantity>({ amount: 2.5, unit: "kg" });
      return (
        <>
          <QuantityInput
            aria-label="Weight"
            units={WEIGHT}
            value={value}
            onValueChange={setValue}
            locale="en-US"
          />
          <button
            type="button"
            onClick={() => {
              setValue({ amount: 3, unit: "kg" });
            }}
          >
            Set 3 kg
          </button>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    await user.selectOptions(unitSelect(), "lb");
    expect(field()).toHaveValue("5.51");
    await user.click(screen.getByRole("button", { name: "Set 3 kg" }));
    await user.selectOptions(unitSelect(), "lb");
    expect(field()).toHaveValue("6.61");
  });

  it("does not move a controlled value its owner does not update", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <QuantityInput
        aria-label="Weight"
        units={WEIGHT}
        value={{ amount: 2.5, unit: "kg" }}
        onValueChange={onValueChange}
      />,
    );
    await user.click(field());
    await user.keyboard("{ArrowUp}");
    expect(onValueChange).toHaveBeenCalledWith({ amount: 2.6, unit: "kg" });
    expect(field()).toHaveAttribute("aria-valuenow", "2.5");
  });

  it("changes nothing when read-only, and everything is off when disabled", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWeight({ readOnly: true });
    await user.click(field());
    await user.keyboard("{ArrowUp}");
    expect(field()).toHaveAttribute("aria-valuenow", "2.5");
    expect(field()).toHaveAttribute("readonly");
    expect(unitSelect()).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Increase/ }));
    expect(field()).toHaveAttribute("aria-valuenow", "2.5");
    unmount();

    const { container } = renderWeight({ disabled: true });
    expect(field()).toBeDisabled();
    expect(unitSelect()).toBeDisabled();
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
    expect(container.firstElementChild).toHaveAttribute("data-disabled");
  });

  it("shows a single unit as text, and still submits it", () => {
    const { container } = render(
      <form>
        <QuantityInput
          aria-label="Disk"
          units={pickUnits(DATA_UNITS, ["GB"])}
          defaultValue={{ amount: 100, unit: "GB" }}
          name="disk"
        />
      </form>,
    );
    expect(screen.queryByRole("combobox")).toBeNull();
    const unit = container.querySelector("[data-slot=quantity-input-unit]");
    expect(unit).toHaveTextContent("GB");
    expect(unit).toHaveAttribute("aria-hidden", "true");
    expect(field()).toHaveAttribute("aria-valuetext", "100 gigabytes");
    expect(new FormData(container.querySelector("form")!).get("diskUnit")).toBe("GB");
  });

  it("puts id, aria-describedby and aria-invalid on the field, where the role is", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <>
        <label htmlFor="weight">Weight</label>
        <QuantityInput id="weight" aria-describedby="hint" aria-invalid units={WEIGHT} />
        <p id="hint">Up to 30 kg</p>
      </>,
    );
    expect(field()).toHaveAttribute("id", "weight");
    expect(field()).toHaveAccessibleName("Weight");
    expect(field()).toHaveAccessibleDescription("Up to 30 kg");
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(unitSelect()).toHaveAccessibleName("unit");
    expect(warn).not.toHaveBeenCalled();
  });

  it("names the unit selector after aria-label or aria-labelledby", () => {
    const { unmount } = render(<QuantityInput aria-label="Weight" units={WEIGHT} />);
    expect(unitSelect()).toHaveAccessibleName("Weight unit");
    unmount();
    render(
      <>
        <span id="heading">Height</span>
        <QuantityInput aria-labelledby="heading" units={WEIGHT} />
      </>,
    );
    expect(field()).toHaveAccessibleName("Height");
    expect(unitSelect()).toHaveAccessibleName("Height unit");
  });

  it("accepts replacement copy", () => {
    render(
      <QuantityInput
        label="Gewicht"
        units={WEIGHT}
        defaultValue={{ amount: 2, unit: "kg" }}
        locale="de-DE"
        labels={{ increase: (step) => `Erhöhen um ${step}`, unit: "Einheit" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Erhöhen um 0,1 kg" })).toBeInTheDocument();
    expect(unitSelect()).toHaveAccessibleName("Gewicht Einheit");
  });

  it("handles negative temperatures and offers a minus key", async () => {
    const user = userEvent.setup();
    render(
      <QuantityInput
        label="Freezer"
        units={TEMPERATURE_UNITS}
        defaultValue={{ amount: -18, unit: "C" }}
        min={{ amount: -273.15, unit: "C" }}
        locale="en-US"
      />,
    );
    expect(field()).toHaveAttribute("inputmode", "text");
    expect(field()).toHaveAttribute("aria-valuetext", "-18 degrees Celsius");
    await user.selectOptions(unitSelect(), "F");
    expect(field()).toHaveValue("-0.4");
    await retype(user, "-40 °F");
    await user.tab();
    expect(field()).toHaveAttribute("aria-valuenow", "-40");
  });

  it("merges className, forwards refs and props, and sizes the control", () => {
    const ref = createRef<HTMLDivElement>();
    const inputRef = createRef<HTMLInputElement>();
    const { container, rerender } = render(
      <QuantityInput
        ref={ref}
        inputRef={inputRef}
        aria-label="Weight"
        units={WEIGHT}
        className="flex-row"
        data-testid="root"
      />,
    );
    const root = screen.getByTestId("root");
    expect(root).toHaveAttribute("data-slot", "quantity-input");
    expect(root).toHaveClass("flex-row");
    expect(root).not.toHaveClass("flex-col");
    expect(ref.current).toBe(root);
    expect(inputRef.current).toBe(field());
    const control = () => container.querySelector("[data-slot=quantity-input-control]");
    expect(control()).toHaveClass("h-9");

    let fromCallback: HTMLInputElement | null = null;
    rerender(
      <QuantityInput
        inputRef={(node) => {
          fromCallback = node;
        }}
        aria-label="Weight"
        units={WEIGHT}
        inputSize="sm"
      />,
    );
    expect(control()).toHaveClass("h-8");
    expect(fromCallback).toBe(field());
    rerender(<QuantityInput aria-label="Weight" units={WEIGHT} inputSize="lg" />);
    expect(control()).toHaveClass("h-10");
  });

  it("warns in development when the field has no name, and needs a unit", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<QuantityInput units={WEIGHT} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no accessible name"));

    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<QuantityInput aria-label="Nothing" units={[]} />)).toThrow(
      /at least one unit/,
    );
  });

  it("has no axe violations, at rest or showing an error", async () => {
    const user = userEvent.setup();
    const { container } = renderWeight({ name: "weight" });
    await expectNoA11yViolations(container);
    await retype(user, "abc");
    await user.tab();
    await expectNoA11yViolations(container);
  });
});
