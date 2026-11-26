import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PullCord } from "./pull-cord";

describe("PullCord", () => {
  it("is a switch named Lamp by default, or by aria-label", () => {
    const { rerender } = render(<PullCord />);
    expect(screen.getByRole("switch", { name: "Lamp" })).not.toBeChecked();
    rerender(<PullCord aria-label="Desk lamp" />);
    expect(screen.getByRole("switch", { name: "Desk lamp" })).toBeInTheDocument();
  });

  it("toggles on click and from the keyboard", async () => {
    const user = userEvent.setup();
    render(<PullCord />);
    const lamp = screen.getByRole("switch");
    await user.click(lamp);
    expect(lamp).toBeChecked();
    await user.keyboard(" ");
    expect(lamp).not.toBeChecked();
    await user.keyboard("{Enter}");
    expect(lamp).toBeChecked();
  });

  it("replays the pull on every toggle but not on first paint", async () => {
    const user = userEvent.setup();
    render(<PullCord defaultChecked />);
    const lamp = screen.getByRole("switch");
    expect(lamp).toBeChecked();
    expect(lamp).not.toHaveAttribute("data-pull");
    await user.click(lamp);
    expect(lamp).toHaveAttribute("data-pull", "a");
    await user.click(lamp);
    expect(lamp).toHaveAttribute("data-pull", "b");
  });

  it("follows a controlled value and pulls when it changes", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <PullCord
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
    expect(screen.getByRole("switch")).toHaveAttribute("data-pull", "a");
  });

  it("takes a glow colour and keeps the drawing aria-hidden", () => {
    render(<PullCord glow="var(--color-info)" />);
    const lamp = screen.getByRole("switch");
    expect(lamp.style.getPropertyValue("--pull-cord-glow")).toBe("var(--color-info)");
    expect(lamp.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    render(<PullCord disabled />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<PullCord ref={ref} className="m-2" />);
    expect(ref.current).toBe(screen.getByRole("switch"));
    expect(ref.current).toHaveClass("m-2", "rounded-2xl");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PullCord />);
    await expectNoA11yViolations(container);
  });
});
