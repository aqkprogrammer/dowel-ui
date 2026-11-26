import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DayNightSwitch } from "./day-night-switch";

describe("DayNightSwitch", () => {
  it("is a switch with the name it is given, off by default", () => {
    render(<DayNightSwitch aria-label="Dark mode" />);
    expect(screen.getByRole("switch", { name: "Dark mode" })).not.toBeChecked();
  });

  it("toggles on click and from the keyboard, squashing only once it has moved", async () => {
    const user = userEvent.setup();
    render(<DayNightSwitch aria-label="Dark mode" />);
    const control = screen.getByRole("switch");
    expect(control).not.toHaveAttribute("data-moved");

    await user.click(control);
    expect(control).toBeChecked();
    expect(control).toHaveAttribute("data-moved");
    await user.keyboard(" ");
    expect(control).not.toBeChecked();
    await user.keyboard("{Enter}");
    expect(control).toBeChecked();
  });

  it("starts on with defaultChecked", () => {
    render(<DayNightSwitch aria-label="Dark mode" defaultChecked />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("follows a controlled value and reports changes", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <DayNightSwitch
          aria-label="Dark mode"
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
    render(<DayNightSwitch aria-label="Dark mode" />);
    expect(screen.getByRole("switch").querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    render(<DayNightSwitch aria-label="Dark mode" disabled />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<DayNightSwitch aria-label="Dark mode" ref={ref} className="mx-2" />);
    expect(ref.current).toBe(screen.getByRole("switch"));
    expect(ref.current).toHaveClass("mx-2", "rounded-full");
  });

  it("gives each moon mask a unique id", () => {
    const { container } = render(
      <>
        <DayNightSwitch aria-label="A" />
        <DayNightSwitch aria-label="B" />
      </>,
    );
    const ids = [...container.querySelectorAll("mask")].map((mask) => mask.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<DayNightSwitch aria-label="Dark mode" />);
    await expectNoA11yViolations(container);
  });
});
