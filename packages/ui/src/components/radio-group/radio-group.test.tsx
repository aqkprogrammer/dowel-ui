import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Label } from "../label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

function Example({
  onValueChange,
  defaultValue = "comfortable",
}: {
  onValueChange?: (value: string) => void;
  defaultValue?: string;
} = {}) {
  return (
    <>
      <span id="density-label">Density</span>
      <RadioGroup
        aria-labelledby="density-label"
        defaultValue={defaultValue}
        onValueChange={onValueChange}
      >
        {[
          { value: "default", label: "Default" },
          { value: "comfortable", label: "Comfortable" },
          { value: "compact", label: "Compact", disabled: true },
        ].map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <RadioGroupItem value={option.value} id={option.value} disabled={option.disabled} />
            <Label htmlFor={option.value}>{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </>
  );
}

describe("RadioGroup", () => {
  it("exposes a named group of radios", () => {
    render(<Example />);
    expect(screen.getByRole("radiogroup", { name: "Density" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("marks the default value as checked", () => {
    render(<Example />);
    expect(screen.getByRole("radio", { name: "Comfortable" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Default" })).not.toBeChecked();
  });

  it("selects on click", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("radio", { name: "Default" }));
    expect(screen.getByRole("radio", { name: "Default" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Comfortable" })).not.toBeChecked();
  });

  it("selects via its label", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByText("Default"));
    expect(screen.getByRole("radio", { name: "Default" })).toBeChecked();
  });

  it("is a single tab stop", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "Comfortable" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("radio", { name: "Default" })).not.toHaveFocus();
  });

  it("moves focus with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("radio", { name: "Default" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Comfortable" })).toHaveFocus();
  });

  // Selection-on-arrow is not asserted here. The primitive sets its
  // "an arrow key is down" flag from a bubble-phase document listener, but
  // roving focus moves focus during the item's own keydown handler, so under
  // jsdom's focus timing the flag is still false when the focus handler runs.
  // Asserting it would test the simulation, not the behaviour; the real-browser
  // path is covered by the Storybook a11y run.

  it("does not select a disabled option", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("radio", { name: "Compact" }));
    expect(screen.getByRole("radio", { name: "Compact" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Comfortable" })).toBeChecked();
  });

  it("reports changes", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Example onValueChange={onValueChange} />);

    await user.click(screen.getByRole("radio", { name: "Default" }));
    expect(onValueChange).toHaveBeenCalledWith("default");
  });

  it("works controlled", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [value, setValue] = useState("a");
      return (
        <RadioGroup aria-label="Choice" value={value} onValueChange={setValue}>
          <RadioGroupItem value="a" aria-label="A" />
          <RadioGroupItem value="b" aria-label="B" />
        </RadioGroup>
      );
    }

    render(<Controlled />);
    await user.click(screen.getByRole("radio", { name: "B" }));
    expect(screen.getByRole("radio", { name: "B" })).toBeChecked();
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(
      <RadioGroup aria-label="Choice" className="gap-8" data-testid="group">
        <RadioGroupItem value="a" aria-label="A" />
      </RadioGroup>,
    );

    const group = screen.getByTestId("group");
    expect(group).toHaveClass("gap-8");
    expect(group).not.toHaveClass("gap-3");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });
});
