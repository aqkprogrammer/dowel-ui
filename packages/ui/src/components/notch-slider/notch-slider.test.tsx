import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { NotchSlider } from "./notch-slider";

const thumb = () => screen.getByRole("slider");

describe("NotchSlider", () => {
  it("is a slider named Size, valued by option name", () => {
    render(<NotchSlider />);
    expect(thumb()).toHaveAccessibleName("Size");
    expect(thumb()).toHaveAttribute("aria-valuenow", "1");
    expect(thumb()).toHaveAttribute("aria-valuemax", "4");
    expect(thumb()).toHaveAttribute("aria-valuetext", "S");
  });

  it("speaks fuller option names when given", () => {
    render(
      <NotchSlider
        aria-label="Shirt size"
        defaultValue="M"
        optionLabels={["Extra small", "Small", "Medium", "Large", "Extra large"]}
      />,
    );
    expect(thumb()).toHaveAccessibleName("Shirt size");
    expect(thumb()).toHaveAttribute("aria-valuetext", "Medium");
  });

  it("steps through the options with the keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NotchSlider onValueChange={onValueChange} />);
    thumb().focus();
    await user.keyboard("{ArrowRight}");
    expect(thumb()).toHaveAttribute("aria-valuetext", "M");
    expect(onValueChange).toHaveBeenLastCalledWith("M");
    await user.keyboard("{End}");
    expect(thumb()).toHaveAttribute("aria-valuetext", "XL");
    await user.keyboard("{Home}");
    expect(thumb()).toHaveAttribute("aria-valuetext", "XS");
  });

  it("marks the active label and selects one on press", () => {
    const { container } = render(<NotchSlider />);
    const label = (text: string) =>
      [...container.querySelectorAll("[aria-hidden=true] > span")].find(
        (node) => node.textContent === text,
      )!;
    expect(label("S")).toHaveAttribute("data-active");
    fireEvent.pointerDown(label("L"));
    expect(label("L")).toHaveAttribute("data-active");
    expect(thumb()).toHaveAttribute("aria-valuetext", "L");
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [size, setSize] = useState("L");
      return (
        <>
          <NotchSlider value={size} onValueChange={setSize} />
          <output>{size}</output>
        </>
      );
    }
    render(<Controlled />);
    thumb().focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("M", { selector: "output" })).toBeInTheDocument();
  });

  it("takes custom options", () => {
    render(<NotchSlider options={["Low", "Mid", "High"]} defaultValue="High" />);
    expect(thumb()).toHaveAttribute("aria-valuemax", "2");
    expect(thumb()).toHaveAttribute("aria-valuetext", "High");
  });

  it("forwards its ref to the slider root and merges className", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(<NotchSlider ref={ref} className="custom" />);
    const root = container.querySelector("[data-slot=notch-slider]");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("custom", "rounded-full");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<NotchSlider />);
    await expectNoA11yViolations(container);
  });
});
