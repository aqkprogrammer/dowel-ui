import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

function Example({ onValueChange }: { onValueChange?: (value: string) => void } = {}) {
  return (
    <>
      <span id="fruit-label">Fruit</span>
      <Select onValueChange={onValueChange}>
        <SelectTrigger aria-labelledby="fruit-label">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="cherry" disabled>
              Cherry
            </SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectItem value="carrot">Carrot</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}

describe("Select", () => {
  it("shows the placeholder before anything is chosen", () => {
    render(<Example />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Select a fruit");
  });

  it("is closed until the trigger is activated", async () => {
    const user = userEvent.setup();
    render(<Example />);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });

  it("reports its state on the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
  });

  it("selects an option and shows it on the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Banana" }));

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Banana");
    });
  });

  it("reports the selected value", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Example onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Apple" }));

    expect(onValueChange).toHaveBeenCalledWith("apple");
  });

  it("opens from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    expect(screen.getByRole("combobox")).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });

  it("does not select a disabled option", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("combobox"));
    const disabled = await screen.findByRole("option", { name: "Cherry" });
    expect(disabled).toHaveAttribute("data-disabled");

    await user.click(disabled);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("closes on Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<Example />);

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    await screen.findByRole("listbox");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("works controlled", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [value, setValue] = useState("apple");
      return (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger aria-label="Fruit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    render(<Controlled />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Apple");

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Banana" }));

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Banana");
    });
  });

  it.each([
    ["sm", "h-8"],
    ["md", "h-9"],
    ["lg", "h-10"],
  ] as const)("applies the %s trigger size", (triggerSize, expectedClass) => {
    render(
      <Select>
        <SelectTrigger triggerSize={triggerSize} aria-label="Fruit">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toHaveClass(expectedClass);
  });

  it("exposes the invalid state", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Fruit" aria-invalid>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
  });

  it("has no accessibility violations when closed", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);

    await user.click(screen.getByRole("combobox"));
    await screen.findByRole("listbox");

    await expectNoA11yViolations(baseElement);
  });
});
