import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Stepper, type StepperStep } from "./stepper";

const STEPS: StepperStep[] = [
  { label: "Account", description: "Create your account", content: <p>Account form</p> },
  { label: "Profile", description: "Set up your profile", content: <p>Profile form</p> },
  { label: "Preferences", content: <p>Preferences form</p> },
  { label: "Complete", icon: <svg data-testid="flag" /> },
];

function items() {
  return within(screen.getByRole("list", { name: "Progress" })).getAllByRole("listitem");
}

describe("Stepper", () => {
  it("renders an ordered list with the current step marked", () => {
    render(<Stepper steps={STEPS} defaultStep={1} />);
    const list = screen.getByRole("list", { name: "Progress" });
    expect(list.tagName).toBe("OL");
    expect(items()).toHaveLength(4);
    expect(items().map((item) => item.getAttribute("data-state"))).toEqual([
      "complete",
      "current",
      "upcoming",
      "upcoming",
    ]);
    const current = list.querySelector('[aria-current="step"]');
    expect(current).toHaveTextContent("Profile");
  });

  it("is an indicator by default, with no buttons", () => {
    render(<Stepper steps={STEPS} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("names finished steps as completed", () => {
    render(<Stepper steps={STEPS} defaultStep={2} navigation="completed" />);
    expect(
      screen.getByRole("button", { name: "Account completed" }),
    ).toHaveAccessibleDescription("Create your account");
    expect(screen.getByRole("button", { name: "Preferences" })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("shows the current step's content in a group labelled by the step", () => {
    render(<Stepper steps={STEPS} defaultStep={1} />);
    expect(screen.getByRole("group", { name: "Profile" })).toHaveTextContent("Profile form");
    expect(screen.queryByText("Account form")).not.toBeInTheDocument();
  });

  it("renders no content area for a step without content", () => {
    const { container } = render(<Stepper steps={STEPS} defaultStep={3} />);
    expect(container.querySelector('[data-slot="stepper-panel"]')).toBeNull();
    expect(screen.getByTestId("flag")).toBeInTheDocument();
  });

  it("changes step on click when every step is navigable, and slides by direction", async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    const { container } = render(
      <Stepper steps={STEPS} navigation="all" onStepChange={onStepChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Preferences" }));
    expect(onStepChange).toHaveBeenCalledWith(2);
    expect(screen.getByText("Preferences form")).toBeInTheDocument();
    const panel = container.querySelector<HTMLElement>('[data-slot="stepper-panel"]');
    expect(panel?.style.getPropertyValue("--dowel-stepper-from")).toBe("20px");

    await user.click(screen.getByRole("button", { name: /Account/ }));
    expect(
      container
        .querySelector<HTMLElement>('[data-slot="stepper-panel"]')
        ?.style.getPropertyValue("--dowel-stepper-from"),
    ).toBe("-20px");
  });

  it("ignores a click on the current step", async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    render(<Stepper steps={STEPS} navigation="all" onStepChange={onStepChange} />);
    await user.click(screen.getByRole("button", { name: "Account" }));
    expect(onStepChange).not.toHaveBeenCalled();
  });

  it("only lets finished steps be revisited in completed mode", () => {
    render(<Stepper steps={STEPS} defaultStep={1} navigation="completed" />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Preferences" })).not.toBeInTheDocument();
  });

  it("skips disabled steps", () => {
    const steps = STEPS.map((step, index) =>
      index === 1 ? { ...step, disabled: true } : step,
    );
    const { container } = render(<Stepper steps={steps} navigation="all" />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(container.querySelector("[data-disabled]")).toHaveTextContent("Profile");
  });

  it("shares one tab stop and moves focus with the arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    render(<Stepper steps={STEPS} navigation="all" onStepChange={onStepChange} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1, -1, -1]);

    await user.tab();
    expect(buttons[0]).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(buttons[1]).toHaveFocus();
    expect(buttons[1]).toHaveAttribute("tabindex", "0");
    expect(onStepChange).not.toHaveBeenCalled();

    await user.keyboard("{End}");
    expect(buttons[3]).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(buttons[3]).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(buttons[2]).toHaveFocus();
    await user.keyboard("{Home}");
    expect(buttons[0]).toHaveFocus();

    await user.keyboard("{ArrowRight}{Enter}");
    expect(onStepChange).toHaveBeenCalledWith(1);
    await user.keyboard("{ArrowRight} ");
    expect(onStepChange).toHaveBeenLastCalledWith(2);
    await user.keyboard("a");
  });

  it("mirrors the arrow keys in RTL", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <Stepper steps={STEPS} navigation="all" />
      </div>,
    );
    const buttons = screen.getAllByRole("button");
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(buttons[1]).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(buttons[0]).toHaveFocus();
  });

  it("uses Up and Down when vertical", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Stepper steps={STEPS} navigation="all" orientation="vertical" />,
    );
    expect(container.firstElementChild).toHaveAttribute("data-orientation", "vertical");
    const buttons = screen.getAllByRole("button");
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(buttons[1]).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(buttons[0]).toHaveFocus();
  });

  it("does nothing with arrow keys when no step is navigable", async () => {
    const user = userEvent.setup();
    render(<Stepper steps={STEPS} />);
    screen.getByRole("list").focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("follows the controlled step and only requests changes", async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    const { rerender } = render(
      <Stepper steps={STEPS} step={0} navigation="all" onStepChange={onStepChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Profile" }));
    expect(onStepChange).toHaveBeenCalledWith(1);
    expect(items()[0]).toHaveAttribute("data-state", "current");

    rerender(<Stepper steps={STEPS} step={3} navigation="all" onStepChange={onStepChange} />);
    expect(items()[3]).toHaveAttribute("data-state", "current");
  });

  it("works with external previous and next buttons", async () => {
    function Wizard() {
      const [step, setStep] = useState(0);
      return (
        <>
          <Stepper steps={STEPS} step={step} onStepChange={setStep} />
          <button
            type="button"
            onClick={() => {
              setStep((s) => s + 1);
            }}
          >
            Next
          </button>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Wizard />);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("group", { name: "Profile" })).toBeInTheDocument();
  });

  it("clamps an out-of-range step", () => {
    render(<Stepper steps={STEPS} step={9} />);
    expect(items()[3]).toHaveAttribute("data-state", "current");
  });

  it("takes custom list and status labels", () => {
    render(
      <Stepper
        steps={STEPS}
        defaultStep={1}
        navigation="completed"
        label="Checkout"
        completedLabel="done"
      />,
    );
    expect(screen.getByRole("list", { name: "Checkout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account done" })).toBeInTheDocument();
  });

  it("lets the consumer className win and forwards a ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Stepper ref={ref} steps={STEPS} className="gap-2" data-testid="root" />,
    );
    expect(container.firstElementChild).toHaveClass("gap-2");
    expect(container.firstElementChild).not.toHaveClass("gap-6");
    expect(ref.current).toBe(screen.getByTestId("root"));
  });

  it("has no detectable accessibility violations", async () => {
    const { container, rerender } = render(<Stepper steps={STEPS} defaultStep={1} />);
    await expectNoA11yViolations(container);
    rerender(<Stepper steps={STEPS} defaultStep={1} navigation="all" orientation="vertical" />);
    await expectNoA11yViolations(container);
  });
});
