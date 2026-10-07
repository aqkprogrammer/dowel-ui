import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Toggle, toggleVariants } from "./toggle";

function Bold() {
  return (
    <svg data-testid="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" />
    </svg>
  );
}

describe("Toggle", () => {
  it("renders an unpressed toggle button named by its label", () => {
    render(
      <Toggle aria-label="Bold">
        <Bold />
      </Toggle>,
    );
    const button = screen.getByRole("button", { name: "Bold" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAttribute("data-state", "off");
    expect(button).toHaveAttribute("data-slot", "toggle");
    const fill = button.querySelector('[data-slot="toggle-fill"]');
    expect(fill).toHaveAttribute("aria-hidden", "true");
  });

  it("turns on and off with a pop, then a dip, but not on first paint", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <Toggle aria-label="Bold" onPressedChange={onPressedChange}>
        <Bold />
      </Toggle>,
    );
    const button = screen.getByRole("button");
    expect(button).not.toHaveAttribute("data-animate");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("data-animate", "on");
    expect(onPressedChange).toHaveBeenLastCalledWith(true);

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAttribute("data-animate", "off");
    expect(onPressedChange).toHaveBeenLastCalledWith(false);
  });

  it("starts pressed without animating when uncontrolled", () => {
    render(<Toggle defaultPressed>Italic</Toggle>);
    const button = screen.getByRole("button", { name: "Italic" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).not.toHaveAttribute("data-animate");
  });

  it("toggles from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Toggle>Wrap</Toggle>);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <Toggle pressed={false} onPressedChange={onPressedChange}>
        Mute
      </Toggle>,
    );
    await user.click(screen.getByRole("button"));
    expect(onPressedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("follows a controlled owner and animates its changes", async () => {
    function Controlled() {
      const [pressed, setPressed] = useState(false);
      return (
        <Toggle pressed={pressed} onPressedChange={setPressed}>
          Pin
        </Toggle>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button")).toHaveAttribute("data-animate", "on");
  });

  it.each([
    ["default", "bg-transparent"],
    ["outline", "border-input"],
  ] as const)("applies the %s variant", (variant, expected) => {
    render(<Toggle variant={variant}>V</Toggle>);
    expect(screen.getByRole("button")).toHaveClass(expected);
  });

  it.each([
    ["sm", "h-8"],
    ["md", "h-9"],
    ["lg", "h-10"],
  ] as const)("applies the %s size", (size, height) => {
    render(<Toggle size={size}>S</Toggle>);
    expect(screen.getByRole("button")).toHaveClass(height);
  });

  it("exports its variants for reuse", () => {
    expect(toggleVariants({ variant: "outline", size: "sm" })).toContain("border-input");
  });

  it("does nothing while disabled", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <Toggle disabled onPressedChange={onPressedChange}>
        Off
      </Toggle>,
    );
    await user.click(screen.getByRole("button"));
    expect(onPressedChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Toggle ref={ref} className="h-12 rounded-full" data-testid="toggle">
        R
      </Toggle>,
    );
    const button = screen.getByTestId("toggle");
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("h-12", "rounded-full");
    expect(button).not.toHaveClass("h-9", "rounded-md");
  });

  it("has no accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Toggle aria-label="Bold">
        <Bold />
      </Toggle>,
    );
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button"));
    await expectNoA11yViolations(container);
  });
});
