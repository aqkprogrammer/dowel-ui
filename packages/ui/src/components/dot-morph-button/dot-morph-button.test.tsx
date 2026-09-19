import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DotMorphButton } from "./dot-morph-button";

function dot() {
  return document.querySelector<HTMLElement>('[data-slot="dot-morph-button-dot"]');
}

describe("DotMorphButton", () => {
  it("is named by its label, with the dot hidden from assistive technology", () => {
    render(<DotMorphButton>Get started</DotMorphButton>);
    expect(screen.getByRole("button", { name: "Get started" })).toHaveAttribute(
      "data-slot",
      "dot-morph-button",
    );
    expect(dot()).toHaveAttribute("aria-hidden", "true");
  });

  it("morphs on hover and on keyboard focus, never on hover alone", () => {
    render(<DotMorphButton>Go</DotMorphButton>);
    const shape = dot()?.firstElementChild;
    expect(shape).toHaveClass(
      "group-hover/dot-morph:h-[1.15em]",
      "group-hover/dot-morph:w-[0.5em]",
    );
    expect(shape).toHaveClass(
      "group-focus-visible/dot-morph:h-[1.15em]",
      "group-focus-visible/dot-morph:w-[0.5em]",
    );
    expect(screen.getByRole("button")).toHaveClass("group/dot-morph");
  });

  it("eases through the motion tokens so reduced motion makes it instant", () => {
    render(<DotMorphButton>Go</DotMorphButton>);
    expect(dot()?.firstElementChild).toHaveClass(
      "duration-[var(--duration-normal)]",
      "ease-[var(--ease-overshoot)]",
    );
  });

  it("colours the dot with the primary tone by default", () => {
    render(<DotMorphButton>Go</DotMorphButton>);
    expect(dot()).toHaveClass("text-primary");
  });

  it.each([
    ["current", undefined],
    ["success", "text-success"],
    ["warning", "text-warning"],
    ["destructive", "text-destructive"],
    ["info", "text-info"],
  ] as const)("applies the %s tone", (tone, expected) => {
    render(<DotMorphButton tone={tone}>Go</DotMorphButton>);
    if (expected) expect(dot()).toHaveClass(expected);
    else expect(dot()?.className).not.toMatch(/\btext-/);
  });

  it("is an outline pill by default and accepts other variants and sizes", () => {
    const { rerender } = render(<DotMorphButton>Go</DotMorphButton>);
    expect(screen.getByRole("button")).toHaveClass("border-input", "rounded-full", "h-9");
    rerender(
      <DotMorphButton variant="secondary" size="lg">
        Go
      </DotMorphButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("bg-secondary", "h-10");
    expect(screen.getByRole("button")).not.toHaveClass("border-input");
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(<DotMorphButton className="h-12 rounded-md">Go</DotMorphButton>);
    const element = screen.getByRole("button");
    expect(element).toHaveClass("rounded-md", "h-12");
    expect(element).not.toHaveClass("rounded-full");
    expect(element).not.toHaveClass("h-9");
  });

  it("forwards a ref and native props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <DotMorphButton ref={ref} type="submit" data-testid="cta">
        Go
      </DotMorphButton>,
    );
    expect(ref.current).toBe(screen.getByTestId("cta"));
    expect(ref.current).toHaveAttribute("type", "submit");
  });

  it("activates with a pointer and from the keyboard", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<DotMorphButton onClick={onClick}>Go</DotMorphButton>);
    await user.click(screen.getByRole("button"));
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("does not activate while disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <DotMorphButton disabled onClick={onClick}>
        Go
      </DotMorphButton>,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div>
        <DotMorphButton>Get started</DotMorphButton>
        <DotMorphButton tone="success" loading>
          Saving
        </DotMorphButton>
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
