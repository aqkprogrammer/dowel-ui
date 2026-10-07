import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FlipButton } from "./flip-button";

function part(button: HTMLElement, name: string) {
  return button.querySelector(`[data-slot="flip-button-${name}"]`);
}

describe("FlipButton", () => {
  it("is named by its front face and hides the back", () => {
    render(<FlipButton front="Follow" back="Say hi" />);
    const button = screen.getByRole("button", { name: "Follow" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("data-state", "front");
    expect(button).not.toHaveAttribute("aria-pressed");
    expect(part(button, "back")).toHaveAttribute("aria-hidden", "true");
    expect(part(button, "back")).toHaveTextContent("Say hi");
  });

  it("uses children as the front face", () => {
    render(<FlipButton back="Back">Front</FlipButton>);
    expect(screen.getByRole("button", { name: "Front" })).toBeInTheDocument();
  });

  it("takes a consumer name", () => {
    render(<FlipButton aria-label="Download report" front={<svg />} back="PDF" />);
    expect(screen.getByRole("button", { name: "Download report" })).toBeInTheDocument();
  });

  it("turns on hover and keyboard focus by default, around the y axis", () => {
    render(<FlipButton front="Front" back="Back" />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-trigger", "hover");
    expect(button).toHaveAttribute("data-axis", "y");
    const card = part(button, "card");
    expect(card).toHaveClass(
      "group-hover/flip:rotate-y-180",
      "group-focus-visible/flip:rotate-y-180",
    );
    expect(part(button, "back")).toHaveClass("rotate-y-180", "backface-hidden");
    expect(part(button, "front")).toHaveClass("backface-hidden");
  });

  it("tumbles around the x axis", () => {
    render(<FlipButton axis="x" front="Front" back="Back" />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-axis", "x");
    expect(part(button, "card")).toHaveClass("group-hover/flip:rotate-x-180");
    expect(part(button, "back")).toHaveClass("rotate-x-180");
  });

  it("does not turn on hover in press mode", () => {
    render(<FlipButton trigger="press" front="Front" back="Back" />);
    const card = part(screen.getByRole("button"), "card");
    expect(card).not.toHaveClass("group-hover/flip:rotate-y-180");
    expect(card).toHaveClass("group-data-[state=back]/flip:rotate-y-180");
  });

  it("toggles on press, exposed as aria-pressed", async () => {
    const user = userEvent.setup();
    const onFlippedChange = vi.fn();
    render(
      <FlipButton
        trigger="press"
        front="Follow"
        back="Following"
        onFlippedChange={onFlippedChange}
      />,
    );
    const button = screen.getByRole("button", { name: "Follow" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("data-state", "back");
    expect(button).toHaveAccessibleName("Follow");
    expect(onFlippedChange).toHaveBeenLastCalledWith(true);

    await user.click(button);
    expect(button).toHaveAttribute("data-state", "front");
    expect(onFlippedChange).toHaveBeenLastCalledWith(false);
  });

  it("toggles from the keyboard", async () => {
    const user = userEvent.setup();
    render(<FlipButton trigger="press" defaultFlipped front="Front" back="Back" />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.keyboard(" ");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("ignores defaultFlipped in hover mode, where it is not a state", () => {
    render(<FlipButton defaultFlipped front="Front" back="Back" />);
    expect(screen.getByRole("button")).toHaveAttribute("data-state", "front");
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onFlippedChange = vi.fn();
    render(
      <FlipButton
        trigger="press"
        flipped={false}
        onFlippedChange={onFlippedChange}
        front="Front"
        back="Back"
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(onFlippedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("follows a controlled state", async () => {
    function Controlled() {
      const [flipped, setFlipped] = useState(false);
      return (
        <FlipButton
          trigger="press"
          flipped={flipped}
          onFlippedChange={setFlipped}
          front="Front"
          back="Back"
        />
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("data-state", "back");
  });

  it("can be held turned over in hover mode", () => {
    render(<FlipButton flipped front="Front" back="Back" />);
    expect(screen.getByRole("button")).toHaveAttribute("data-state", "back");
  });

  it("respects a prevented click", async () => {
    const user = userEvent.setup();
    render(
      <FlipButton
        trigger="press"
        front="Front"
        back="Back"
        onClick={(event) => {
          event.preventDefault();
        }}
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("does nothing while disabled", async () => {
    const user = userEvent.setup();
    const onFlippedChange = vi.fn();
    render(
      <FlipButton
        disabled
        trigger="press"
        onFlippedChange={onFlippedChange}
        front="Front"
        back="Back"
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(onFlippedChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("styles each face as a Button surface", () => {
    render(
      <FlipButton variant="destructive" backVariant="outline" front="Front" back="Back" />,
    );
    const button = screen.getByRole("button");
    expect(part(button, "front")).toHaveClass("bg-destructive");
    expect(part(button, "back")).toHaveClass("border-input");
  });

  it("defaults to a primary front and a secondary back", () => {
    render(<FlipButton front="Front" back="Back" />);
    const button = screen.getByRole("button");
    expect(part(button, "front")).toHaveClass("bg-primary");
    expect(part(button, "back")).toHaveClass("bg-secondary");
  });

  it.each([
    ["sm", "h-8", "rounded-md"],
    ["md", "h-9", "rounded-md"],
    ["lg", "h-10", "rounded-lg"],
    ["icon", "size-9", "rounded-md"],
    ["icon-sm", "size-8", "rounded-md"],
  ] as const)("applies the %s size to both faces", (size, height, radius) => {
    render(<FlipButton size={size} aria-label="Flip" front="F" back="B" />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass(radius);
    expect(part(button, "front")).toHaveClass(height);
    expect(part(button, "back")).toHaveClass(height);
  });

  it.each([
    ["pill", "rounded-full"],
    ["square", "rounded-none"],
  ] as const)("applies the %s shape", (shape, radius) => {
    render(<FlipButton shape={shape} front="F" back="B" />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass(radius);
    expect(part(button, "front")).toHaveClass(radius);
  });

  it("takes face classes", () => {
    render(<FlipButton frontClassName="px-8" backClassName="px-10" front="F" back="B" />);
    const button = screen.getByRole("button");
    expect(part(button, "front")).toHaveClass("px-8");
    expect(part(button, "front")).not.toHaveClass("px-4");
    expect(part(button, "back")).toHaveClass("px-10");
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <FlipButton
        ref={ref}
        className="rounded-xl"
        data-testid="flip"
        type="submit"
        front="F"
        back="B"
      />,
    );
    const button = screen.getByTestId("flip");
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("rounded-xl");
    expect(button).not.toHaveClass("rounded-md");
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("data-slot", "flip-button");
  });

  it("ships its spring with the component", () => {
    render(<FlipButton front="F" back="B" />);
    const style = document.querySelector("style[data-href='dowel-flip-button']");
    expect(style?.textContent).toContain("linear(");
    expect(style?.textContent).toContain("var(--motion-scale, 1)");
  });

  it("has no accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div>
        <FlipButton front="Follow" back="Say hi" />
        <FlipButton trigger="press" front="Subscribe" back="Subscribed" />
      </div>,
    );
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    await expectNoA11yViolations(container);
  });
});
