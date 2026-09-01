import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Label } from "../label";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("renders unchecked by default", () => {
    render(<Checkbox aria-label="Accept terms" />);
    expect(screen.getByRole("checkbox", { name: "Accept terms" })).not.toBeChecked();
  });

  it("takes its accessible name from an associated label", () => {
    render(
      <>
        <Checkbox id="terms" />
        <Label htmlFor="terms">Accept terms</Label>
      </>,
    );
    expect(screen.getByRole("checkbox", { name: "Accept terms" })).toBeInTheDocument();
  });

  it("toggles on click", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Accept" />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("toggles with the Space key", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Accept" />);

    await user.tab();
    expect(screen.getByRole("checkbox")).toHaveFocus();

    await user.keyboard(" ");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("reports changes", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Checkbox aria-label="Accept" onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("works controlled", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [checked, setChecked] = useState(false);
      // onCheckedChange yields CheckedState (boolean | "indeterminate"), not a
      // boolean — indeterminate is a state the application sets, so a boolean
      // store narrows it here rather than widening the state.
      return (
        <Checkbox
          aria-label="Accept"
          checked={checked}
          onCheckedChange={(next) => {
            setChecked(next === true);
          }}
        />
      );
    }

    render(<Controlled />);
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("announces the indeterminate state as mixed", () => {
    render(<Checkbox aria-label="Select all" checked="indeterminate" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "mixed");
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-state", "indeterminate");
  });

  it("does not toggle while disabled", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Checkbox aria-label="Accept" disabled onCheckedChange={onCheckedChange} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();
    await user.click(checkbox);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("exposes the invalid state", () => {
    render(<Checkbox aria-label="Accept" aria-invalid />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(<Checkbox aria-label="Accept" className="size-6" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveClass("size-6");
    expect(checkbox).not.toHaveClass("size-4");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div className="flex items-center gap-2">
        <Checkbox id="a11y-terms" />
        <Label htmlFor="a11y-terms">Accept terms</Label>
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
