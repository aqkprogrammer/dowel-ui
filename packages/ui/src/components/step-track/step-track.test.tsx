import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { StepTrack } from "./step-track";

const current = () =>
  screen.getAllByRole("listitem").find((item) => item.ariaCurrent === "step");

describe("StepTrack", () => {
  it("is a named group with a list of steps", () => {
    render(<StepTrack aria-label="Checkout" />);
    expect(screen.getByRole("group", { name: "Checkout" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(current()).toHaveTextContent("Step 1 of 4");
  });

  it("names steps from labels", () => {
    render(<StepTrack steps={["Cart", "Shipping", "Pay"]} defaultValue={1} />);
    expect(current()).toHaveTextContent("Step 2 of 3: Shipping");
  });

  it("moves with the buttons, by click and keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<StepTrack onValueChange={onValueChange} />);
    const previous = screen.getByRole("button", { name: "Previous step" });
    const next = screen.getByRole("button", { name: "Next step" });
    expect(previous).toBeDisabled();

    await user.click(next);
    expect(current()).toHaveTextContent("Step 2 of 4");
    expect(onValueChange).toHaveBeenLastCalledWith(1);

    next.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(current()).toHaveTextContent("Step 4 of 4");
    expect(next).toBeDisabled();
  });

  it("announces the current step politely", async () => {
    const user = userEvent.setup();
    const { container } = render(<StepTrack />);
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(container.querySelector("[aria-live=polite]")).toHaveTextContent("Step 2 of 4");
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [step, setStep] = useState(2);
      return <StepTrack value={step} onValueChange={setStep} />;
    }
    render(<Controlled />);
    expect(current()).toHaveTextContent("Step 3 of 4");
    await user.click(screen.getByRole("button", { name: "Previous step" }));
    expect(current()).toHaveTextContent("Step 2 of 4");
  });

  it("can hide the buttons", () => {
    render(<StepTrack hideControls value={1} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(<StepTrack ref={ref} className="custom" />);
    expect(ref.current).toBe(screen.getByRole("group"));
    expect(ref.current).toHaveClass("custom", "inline-flex");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<StepTrack value={1} />);
    await expectNoA11yViolations(container);
  });
});
