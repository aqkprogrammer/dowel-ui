import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Label } from "../label";
import { Switch } from "./switch";

describe("Switch", () => {
  it("is exposed as a switch, not a checkbox", () => {
    render(<Switch aria-label="Airplane mode" />);
    expect(screen.getByRole("switch", { name: "Airplane mode" })).toBeInTheDocument();
  });

  it("starts off", () => {
    render(<Switch aria-label="Airplane mode" />);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("toggles on click", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Airplane mode" />);

    const control = screen.getByRole("switch");
    await user.click(control);
    expect(control).toBeChecked();
  });

  it("toggles from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Airplane mode" />);

    await user.tab();
    expect(screen.getByRole("switch")).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("reports changes", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch aria-label="Airplane mode" onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("works controlled", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [on, setOn] = useState(false);
      return <Switch aria-label="Airplane mode" checked={on} onCheckedChange={setOn} />;
    }

    render(<Controlled />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("does not toggle while disabled", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch aria-label="Airplane mode" disabled onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("moves its thumb to reflect state, not colour alone", async () => {
    const user = userEvent.setup();
    const { container } = render(<Switch aria-label="Airplane mode" />);

    const thumb = container.querySelector("[data-slot='switch-thumb']");
    expect(thumb).toHaveAttribute("data-state", "unchecked");

    await user.click(screen.getByRole("switch"));
    expect(thumb).toHaveAttribute("data-state", "checked");
  });

  it("takes its name from an associated label", () => {
    render(
      <>
        <Switch id="wifi" />
        <Label htmlFor="wifi">Wi-Fi</Label>
      </>,
    );
    expect(screen.getByRole("switch", { name: "Wi-Fi" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div className="flex items-center gap-2">
        <Switch id="a11y-wifi" />
        <Label htmlFor="a11y-wifi">Wi-Fi</Label>
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
