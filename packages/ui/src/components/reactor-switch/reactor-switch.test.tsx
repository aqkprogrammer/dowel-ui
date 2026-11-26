import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ReactorSwitch } from "./reactor-switch";

describe("ReactorSwitch", () => {
  it("is a switch with the name it is given", () => {
    render(<ReactorSwitch aria-label="Reactor" />);
    expect(screen.getByRole("switch", { name: "Reactor" })).not.toBeChecked();
  });

  it("toggles on click and from the keyboard", async () => {
    const user = userEvent.setup();
    render(<ReactorSwitch aria-label="Reactor" />);
    const control = screen.getByRole("switch");

    await user.click(control);
    expect(control).toBeChecked();
    await user.keyboard(" ");
    expect(control).not.toBeChecked();
  });

  it("starts on with defaultChecked", () => {
    render(<ReactorSwitch aria-label="Reactor" defaultChecked />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    function Controlled() {
      const [on, setOn] = useState(true);
      return (
        <ReactorSwitch
          aria-label="Reactor"
          checked={on}
          onCheckedChange={(next) => {
            setOn(next);
            onCheckedChange(next);
          }}
        />
      );
    }
    render(<Controlled />);

    expect(screen.getByRole("switch")).toBeChecked();
    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("shows a hidden readout only when asked", () => {
    const { unmount } = render(<ReactorSwitch aria-label="Reactor" />);
    expect(document.querySelector('[data-slot="reactor-switch-readout"]')).toBeNull();
    unmount();

    render(<ReactorSwitch aria-label="Reactor" readout defaultChecked />);
    const readout = document.querySelector('[data-slot="reactor-switch-readout"]');
    expect(readout).toHaveAttribute("aria-hidden", "true");
    expect(readout).toHaveTextContent(/100%/);
  });

  it("forwards its ref to the button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<ReactorSwitch aria-label="Reactor" ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("switch"));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ReactorSwitch aria-label="Reactor" readout />);
    await expectNoA11yViolations(container);
  });
});
