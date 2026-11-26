import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SnowGlobeSwitch } from "./snow-globe-switch";

describe("SnowGlobeSwitch", () => {
  it("is a switch with the name it is given", () => {
    render(<SnowGlobeSwitch aria-label="Snow globe" />);
    expect(screen.getByRole("switch", { name: "Snow globe" })).not.toBeChecked();
  });

  it("toggles on click and from the keyboard", async () => {
    const user = userEvent.setup();
    render(<SnowGlobeSwitch aria-label="Snow globe" />);
    const control = screen.getByRole("switch");

    await user.click(control);
    expect(control).toBeChecked();
    await user.keyboard(" ");
    expect(control).not.toBeChecked();
  });

  it("starts on with defaultChecked", () => {
    render(<SnowGlobeSwitch aria-label="Snow globe" defaultChecked />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("follows a controlled value and reports changes", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <SnowGlobeSwitch
          aria-label="Snow globe"
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
    render(<SnowGlobeSwitch aria-label="Snow globe" />);
    expect(screen.getByRole("switch").querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    render(<SnowGlobeSwitch aria-label="Snow globe" disabled />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("forwards its ref to the button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<SnowGlobeSwitch aria-label="Snow globe" ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("switch"));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SnowGlobeSwitch aria-label="Snow globe" />);
    await expectNoA11yViolations(container);
  });
});
