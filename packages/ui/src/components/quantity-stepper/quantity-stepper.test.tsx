import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { QuantityStepper } from "./quantity-stepper";

const dec = () => screen.getByRole("button", { name: "Decrease quantity" });
const inc = () => screen.getByRole("button", { name: "Increase quantity" });
const output = () => screen.getByRole("status");

describe("QuantityStepper", () => {
  it("is a named group with two buttons and a live count", () => {
    render(<QuantityStepper defaultValue={2} />);
    expect(screen.getByRole("group", { name: "Quantity" })).toBeInTheDocument();
    expect(dec()).toBeInTheDocument();
    expect(inc()).toBeInTheDocument();
    expect(output()).toHaveTextContent("2");
    expect(output()).toHaveAttribute("aria-live", "polite");
  });

  it("counts up and down by click and keyboard, rolling the right way", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <QuantityStepper defaultValue={2} onValueChange={onValueChange} />,
    );

    await user.click(inc());
    expect(onValueChange).toHaveBeenLastCalledWith(3);
    expect(container.querySelector("[data-part=in]")).toHaveAttribute("data-dir", "up");
    expect(container.querySelector("[data-part=out]")).toHaveTextContent("2");

    dec().focus();
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(2);
    expect(container.querySelector("[data-part=in]")).toHaveAttribute("data-dir", "down");
  });

  it("flashes the pressed button", async () => {
    const user = userEvent.setup();
    const { container } = render(<QuantityStepper defaultValue={2} />);
    await user.click(inc());
    const flash = container.querySelector("[data-slot=quantity-stepper-inc] [data-part=flash]");
    expect(flash).toHaveAttribute("data-on");
  });

  it("stops at its bounds", async () => {
    const user = userEvent.setup();
    render(<QuantityStepper defaultValue={1} min={1} max={2} />);
    expect(dec()).toBeDisabled();
    await user.click(inc());
    expect(inc()).toBeDisabled();
    expect(output()).toHaveTextContent("2");
  });

  it("shows a total from the unit price", async () => {
    const user = userEvent.setup();
    render(<QuantityStepper defaultValue={2} unitPrice={24} />);
    expect(screen.getByText("$48")).toBeInTheDocument();
    await user.click(inc());
    expect(screen.getByText("$72")).toBeInTheDocument();
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [count, setCount] = useState(4);
      return (
        <QuantityStepper
          value={count}
          onValueChange={setCount}
          formatTotal={(t) => `${t} pts`}
          unitPrice={10}
        />
      );
    }
    render(<Controlled />);
    await user.click(dec());
    expect(output()).toHaveTextContent("3");
    expect(screen.getByText("30 pts")).toBeInTheDocument();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(<QuantityStepper ref={ref} className="custom" />);
    expect(ref.current).toBe(screen.getByRole("group"));
    expect(ref.current).toHaveClass("custom", "inline-flex");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<QuantityStepper defaultValue={2} unitPrice={24} />);
    await expectNoA11yViolations(container);
  });
});
