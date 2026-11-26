import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SymbioteSwitch } from "./symbiote-switch";

describe("SymbioteSwitch", () => {
  it("is a switch with the name it is given", () => {
    render(<SymbioteSwitch aria-label="Symbiote" />);
    expect(screen.getByRole("switch", { name: "Symbiote" })).not.toBeChecked();
  });

  it("toggles on click and from the keyboard", async () => {
    const user = userEvent.setup();
    render(<SymbioteSwitch aria-label="Symbiote" />);
    const control = screen.getByRole("switch");

    await user.click(control);
    expect(control).toBeChecked();
    await user.keyboard(" ");
    expect(control).not.toBeChecked();
  });

  it("plays its one-off motion only after a toggle", async () => {
    const user = userEvent.setup();
    render(<SymbioteSwitch aria-label="Symbiote" defaultChecked />);
    const control = screen.getByRole("switch");

    expect(control).not.toHaveAttribute("data-moved");
    await user.click(control);
    expect(control).toHaveAttribute("data-moved");
  });

  it("reports changes and works controlled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <SymbioteSwitch
          aria-label="Symbiote"
          checked={on}
          onCheckedChange={(next) => {
            setOn(next);
            onCheckedChange(next);
          }}
        />
      );
    }
    render(<Controlled />);

    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("keeps the artwork out of the accessibility tree", () => {
    render(<SymbioteSwitch aria-label="Symbiote" />);
    expect(screen.getByRole("switch").querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    render(<SymbioteSwitch aria-label="Symbiote" disabled />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("forwards its ref to the button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<SymbioteSwitch aria-label="Symbiote" ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("switch"));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SymbioteSwitch aria-label="Symbiote" />);
    await expectNoA11yViolations(container);
  });
});
