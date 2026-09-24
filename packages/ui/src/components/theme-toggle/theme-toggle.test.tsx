import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ThemeToggle, type ThemeToggleTheme } from "./theme-toggle";

const toggle = () => screen.getByRole("switch");
const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`);

describe("ThemeToggle", () => {
  it("is a switch named Dark mode that starts light", () => {
    render(<ThemeToggle />);
    const control = screen.getByRole("switch", { name: "Dark mode" });
    expect(control).toHaveAttribute("aria-checked", "false");
    expect(control).toHaveAttribute("data-slot", "theme-toggle");
    expect(control).toHaveAttribute("data-mode", "light");
    expect(control).toHaveAttribute("data-variant", "icon");
  });

  it("draws a decorative sun and moon glyph with a per-instance mask", () => {
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>,
    );
    const icons = document.querySelectorAll('[data-slot="theme-toggle-icon"]');
    expect(icons).toHaveLength(2);
    for (const icon of icons) expect(icon).toHaveAttribute("aria-hidden", "true");
    const [first, second] = [...document.querySelectorAll("mask")].map((mask) => mask.id);
    expect(first).toBeTruthy();
    expect(first).not.toBe(second);
    const disc = document.querySelector('[data-slot="theme-toggle-disc"]');
    expect(disc).toHaveAttribute("mask", `url(#${String(first)})`);
    expect(slot("theme-toggle-rays")).toBeInTheDocument();
    expect(slot("theme-toggle-shadow")).toBeInTheDocument();
  });

  it("asks for dark and back again on click", async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();
    render(<ThemeToggle onThemeChange={onThemeChange} />);
    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-checked", "true");
    expect(toggle()).toHaveAttribute("data-state", "checked");
    expect(toggle()).toHaveAttribute("data-mode", "dark");
    expect(onThemeChange).toHaveBeenLastCalledWith("dark");
    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-checked", "false");
    expect(onThemeChange).toHaveBeenLastCalledWith("light");
  });

  it("toggles from the keyboard with Space and Enter", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.tab();
    expect(toggle()).toHaveFocus();
    await user.keyboard(" ");
    expect(toggle()).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{Enter}");
    expect(toggle()).toHaveAttribute("aria-checked", "false");
  });

  it("starts dark when asked", () => {
    render(<ThemeToggle defaultTheme="dark" />);
    expect(toggle()).toHaveAttribute("aria-checked", "true");
  });

  it("follows a controlled theme and only requests changes", async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();
    const { rerender } = render(<ThemeToggle theme="light" onThemeChange={onThemeChange} />);
    await user.click(toggle());
    expect(onThemeChange).toHaveBeenCalledWith("dark");
    expect(toggle()).toHaveAttribute("aria-checked", "false");
    rerender(<ThemeToggle theme="dark" onThemeChange={onThemeChange} />);
    expect(toggle()).toHaveAttribute("aria-checked", "true");
  });

  it("works as a controlled pair with state", async () => {
    function Controlled() {
      const [theme, setTheme] = useState<ThemeToggleTheme>("dark");
      return (
        <>
          <ThemeToggle theme={theme} onThemeChange={setTheme} />
          <output>{theme}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(toggle());
    expect(screen.getByRole("status")).toHaveTextContent("light");
    expect(toggle()).toHaveAttribute("aria-checked", "false");
  });

  it("does not touch the document", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const before = document.documentElement.className;
    await user.click(toggle());
    expect(document.documentElement.className).toBe(before);
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });

  it("renders a switch track whose knob carries the icon", () => {
    render(<ThemeToggle variant="switch" size="lg" />);
    const knob = slot("theme-toggle-knob");
    expect(knob).toHaveAttribute("aria-hidden", "true");
    expect(knob?.querySelector('[data-slot="theme-toggle-icon"]')).toBeInTheDocument();
    expect(toggle()).toHaveAttribute("data-variant", "switch");
    expect(toggle()).toHaveClass("h-8", "w-14", "rounded-full", "bg-input");
  });

  it("sizes each variant", () => {
    const { rerender } = render(<ThemeToggle size="sm" />);
    expect(toggle()).toHaveClass("size-8");
    rerender(<ThemeToggle size="md" />);
    expect(toggle()).toHaveClass("size-9");
    rerender(<ThemeToggle size="lg" />);
    expect(toggle()).toHaveClass("size-10");
    rerender(<ThemeToggle variant="switch" size="sm" />);
    expect(toggle()).toHaveClass("h-6", "w-10");
    rerender(<ThemeToggle variant="switch" />);
    expect(toggle()).toHaveClass("h-7", "w-12");
  });

  it("does nothing when disabled", async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();
    render(<ThemeToggle disabled onThemeChange={onThemeChange} />);
    expect(toggle()).toBeDisabled();
    await user.click(toggle());
    expect(onThemeChange).not.toHaveBeenCalled();
    expect(toggle()).toHaveAttribute("aria-checked", "false");
  });

  it("takes a custom name or a labelling element", () => {
    const { rerender } = render(<ThemeToggle aria-label="Night theme" />);
    expect(screen.getByRole("switch", { name: "Night theme" })).toBeInTheDocument();
    rerender(
      <>
        <span id="theme-label">Use dark colours</span>
        <ThemeToggle aria-labelledby="theme-label" />
      </>,
    );
    expect(toggle()).not.toHaveAttribute("aria-label");
    expect(screen.getByRole("switch", { name: "Use dark colours" })).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<ThemeToggle ref={ref} className="size-12 rounded-full" data-testid="theme" />);
    const control = screen.getByTestId("theme");
    expect(ref.current).toBe(control);
    expect(control).toHaveClass("size-12", "rounded-full");
    expect(control).not.toHaveClass("size-9", "rounded-md");
  });

  it("has no accessibility violations in either state or variant", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <ThemeToggle />
        <ThemeToggle variant="switch" aria-label="Dark theme" />
      </>,
    );
    await expectNoA11yViolations(container);
    for (const control of screen.getAllByRole("switch")) await user.click(control);
    await expectNoA11yViolations(container);
  });
});
