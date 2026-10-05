import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { LiquidButton } from "./liquid-button";

function part(button: HTMLElement, name: string) {
  return button.querySelector(`[data-slot="liquid-button-${name}"]`);
}

describe("LiquidButton", () => {
  it("renders a button named once, by its children", () => {
    render(<LiquidButton>Get started</LiquidButton>);
    const button = screen.getByRole("button", { name: "Get started" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("data-slot", "liquid-button");
    expect(part(button, "label")).toHaveTextContent("Get started");
    // The inverted copy is there for the eye only.
    expect(part(button, "fill-label")).toHaveAttribute("aria-hidden", "true");
    expect(part(button, "fill-label")).toHaveTextContent("Get started");
    expect(part(button, "liquid")).toHaveAttribute("aria-hidden", "true");
  });

  it("rises on hover, keyboard focus and press, with the label clip on the same timing", () => {
    render(<LiquidButton>Go</LiquidButton>);
    const button = screen.getByRole("button");
    const liquid = part(button, "liquid");
    const label = part(button, "fill-label");
    for (const state of ["hover", "focus-visible", "active"]) {
      expect(liquid).toHaveClass(`group-${state}/liquid:translate-y-0`);
      expect(label).toHaveClass(`group-${state}/liquid:[clip-path:inset(0_0_0_0)]`);
    }
    expect(liquid).toHaveClass("translate-y-[calc(100%+0.8em)]");
    expect(label).toHaveClass("[clip-path:inset(calc(100%+0.8em)_0_0_0)]");
    const timing = ["duration-[var(--duration-slower)]", "ease-[var(--ease-in-out-quint)]"];
    expect(liquid).toHaveClass(...timing);
    expect(label).toHaveClass(...timing);
  });

  it("draws a two-layer rolling surface", () => {
    render(<LiquidButton>Go</LiquidButton>);
    const waves = screen
      .getByRole("button")
      .querySelectorAll('[data-slot="liquid-button-wave"]');
    expect([...waves].map((wave) => wave.getAttribute("data-layer"))).toEqual([
      "back",
      "front",
    ]);
    const sheet = document.querySelector("style[data-href='dowel-liquid-button']")?.textContent;
    expect(sheet).toContain("dowel-liquid-button-roll");
    expect(sheet).toContain("infinite");
    expect(sheet).toContain("var(--motion-scale, 1)");
  });

  it("does not slosh on first paint", () => {
    render(<LiquidButton>Go</LiquidButton>);
    expect(screen.getByRole("button")).not.toHaveAttribute("data-slosh");
  });

  it("sloshes on every press, restarting each time", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<LiquidButton onClick={onClick}>Go</LiquidButton>);
    const button = screen.getByRole("button");
    await user.click(button);
    expect(button).toHaveAttribute("data-slosh", "a");
    await user.click(button);
    expect(button).toHaveAttribute("data-slosh", "b");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("sloshes from the keyboard", async () => {
    const user = userEvent.setup();
    render(<LiquidButton>Go</LiquidButton>);
    const button = screen.getByRole("button");
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("data-slosh", "a");
    await user.keyboard(" ");
    expect(button).toHaveAttribute("data-slosh", "b");
  });

  it("ignores other keys, held keys and secondary buttons", () => {
    render(<LiquidButton>Go</LiquidButton>);
    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "a" });
    fireEvent.keyDown(button, { key: "Enter", repeat: true });
    fireEvent.pointerDown(button, { button: 2 });
    expect(button).not.toHaveAttribute("data-slosh");
  });

  it("runs consumer handlers first and respects preventDefault", () => {
    const onPointerDown = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    const onKeyDown = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    render(
      <LiquidButton onPointerDown={onPointerDown} onKeyDown={onKeyDown}>
        Go
      </LiquidButton>,
    );
    const button = screen.getByRole("button");
    fireEvent.pointerDown(button, { button: 0 });
    fireEvent.keyDown(button, { key: " " });
    expect(onPointerDown).toHaveBeenCalled();
    expect(onKeyDown).toHaveBeenCalled();
    expect(button).not.toHaveAttribute("data-slosh");
  });

  it("does nothing while disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <LiquidButton disabled onClick={onClick}>
        Go
      </LiquidButton>,
    );
    const button = screen.getByRole("button");
    await user.click(button);
    fireEvent.pointerDown(button, { button: 0 });
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute("data-slosh");
  });

  it.each([
    ["primary", "text-primary", "text-primary-foreground"],
    ["foreground", "text-foreground", "text-background"],
    ["destructive", "text-destructive", "text-destructive-foreground"],
    ["success", "text-success", "text-success-foreground"],
  ] as const)("applies the %s tone and its paired label colour", (tone, color, onLiquid) => {
    render(<LiquidButton tone={tone}>Go</LiquidButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass(color);
    expect(part(button, "fill-label")).toHaveClass(onLiquid);
  });

  it.each([
    ["sm", "h-8"],
    ["md", "h-10"],
    ["lg", "h-12"],
  ] as const)("applies the %s size", (size, height) => {
    render(<LiquidButton size={size}>Go</LiquidButton>);
    expect(screen.getByRole("button")).toHaveClass(height);
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <LiquidButton ref={ref} className="rounded-md px-10" data-testid="liquid" type="submit">
        Go
      </LiquidButton>,
    );
    const button = screen.getByTestId("liquid");
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("rounded-md", "px-10");
    expect(button).not.toHaveClass("rounded-full", "px-5");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("takes an aria-label for icon-only content", () => {
    render(
      <LiquidButton aria-label="Upload">
        <svg aria-hidden="true" />
      </LiquidButton>,
    );
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = render(<LiquidButton>Get started</LiquidButton>);
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button"));
    await expectNoA11yViolations(container);
  });
});
