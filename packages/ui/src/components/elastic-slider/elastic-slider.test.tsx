import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ElasticSlider, rubberBand } from "./elastic-slider";

describe("rubberBand", () => {
  it("is zero with no overshoot and keeps the overshoot's sign", () => {
    expect(rubberBand(0, 16)).toBe(0);
    expect(rubberBand(20, 16)).toBeGreaterThan(0);
    expect(rubberBand(-20, 16)).toBeLessThan(0);
  });

  it("resists: grows ever more slowly and never passes the limit", () => {
    const a = rubberBand(20, 16);
    const b = rubberBand(40, 16);
    const far = rubberBand(10_000, 16);
    expect(b - a).toBeLessThan(a);
    expect(far).toBeLessThanOrEqual(16);
    expect(far).toBeGreaterThan(15.9);
  });

  it("does not stretch with no allowance", () => {
    expect(rubberBand(50, 0)).toBe(0);
  });
});

describe("ElasticSlider", () => {
  it("is a named slider with the value spoken through formatValue", () => {
    render(
      <ElasticSlider
        aria-label="Volume"
        defaultValue={40}
        formatValue={(v) => `${String(v)}%`}
      />,
    );
    const slider = screen.getByRole("slider", { name: "Volume" });
    expect(slider).toHaveAttribute("aria-valuenow", "40");
    expect(slider).toHaveAttribute("aria-valuetext", "40%");
  });

  it("moves with the keyboard and reports changes", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ElasticSlider aria-label="Volume" defaultValue={50} onValueChange={onValueChange} />,
    );
    screen.getByRole("slider").focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(51);
    await user.keyboard("{End}");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "100");
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState(10);
      return (
        <>
          <ElasticSlider aria-label="Volume" value={value} onValueChange={setValue} />
          <button type="button" onClick={() => setValue(90)}>
            Loud
          </button>
        </>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Loud" }));
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "90");
  });

  it("marks itself held while pressed", () => {
    const { container } = render(<ElasticSlider aria-label="Volume" />);
    const root = container.querySelector<HTMLElement>('[data-slot="elastic-slider"]')!;
    fireEvent.pointerDown(root, { pointerId: 1, button: 0, clientX: 10 });
    expect(root).toHaveAttribute("data-held");
    fireEvent.pointerUp(root, { pointerId: 1 });
    expect(root).not.toHaveAttribute("data-held");
  });

  it("renders icons as decoration on either side", () => {
    const { container } = render(
      <ElasticSlider aria-label="Volume" startIcon={<svg />} endIcon={<svg />} />,
    );
    const icons = container.querySelectorAll('[data-slot="elastic-slider-icon"]');
    expect(icons).toHaveLength(2);
    icons.forEach((icon) => expect(icon).toHaveAttribute("aria-hidden", "true"));
  });

  it("does not move when disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ElasticSlider aria-label="Volume" disabled onValueChange={onValueChange} />);
    screen.getByRole("slider").focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ElasticSlider aria-label="Volume" startIcon={<svg />} endIcon={<svg />} />,
    );
    await expectNoA11yViolations(container);
  });
});
