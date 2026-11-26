import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PlanPicker } from "./plan-picker";

function ring(container: HTMLElement) {
  return container.querySelector<HTMLElement>("[data-slot=plan-picker-ring]");
}

describe("PlanPicker", () => {
  it("is a named radio group whose radios are named by plan and price", () => {
    render(<PlanPicker />);
    expect(screen.getByRole("radiogroup", { name: "Plan" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Basic Free" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Pro $4/mo" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Team $12/mo" })).toBeInTheDocument();
  });

  it("chooses on click and moves the ring", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(<PlanPicker onValueChange={onValueChange} />);
    expect(ring(container)?.style.insetInlineStart).toContain("calc(0 *");

    await user.click(screen.getByRole("radio", { name: /Team/ }));
    expect(onValueChange).toHaveBeenCalledWith("team");
    expect(screen.getByRole("radio", { name: /Team/ })).toBeChecked();
    expect(ring(container)?.style.insetInlineStart).toContain("calc(2 *");
    expect(ring(container)?.style.insetInlineEnd).toContain("calc(0 *");
    expect(ring(container)?.style.transition).toContain("var(--motion-scale, 1)");
  });

  it("moves with arrow keys and chooses with Space", async () => {
    const user = userEvent.setup();
    render(<PlanPicker />);
    await user.tab();
    expect(screen.getByRole("radio", { name: /Basic/ })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /Pro/ })).toHaveFocus();
    // Selection-on-arrow is the primitive's and not observable under jsdom's
    // focus timing (see radio-group's test); Space chooses the focused card.
    await user.keyboard(" ");
    expect(screen.getByRole("radio", { name: /Pro/ })).toBeChecked();
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState("pro");
      return (
        <>
          <PlanPicker value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("radio", { name: /Pro/ })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /Basic/ }));
    expect(screen.getByText("basic", { selector: "output" })).toBeInTheDocument();
  });

  it("takes custom plans and respects disabled ones", async () => {
    const user = userEvent.setup();
    render(
      <PlanPicker
        aria-label="Tier"
        plans={[
          { value: "a", label: "Alpha", price: "$1" },
          { value: "b", label: "Beta", disabled: true },
        ]}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Tier" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Beta" }));
    expect(screen.getByRole("radio", { name: "Beta" })).not.toBeChecked();
  });

  it("keeps the ring out of the accessibility tree", () => {
    const { container } = render(<PlanPicker />);
    expect(ring(container)).toHaveAttribute("aria-hidden", "true");
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(<PlanPicker ref={ref} className="w-80" />);
    expect(ref.current).toBe(screen.getByRole("radiogroup"));
    expect(ref.current).toHaveClass("w-80", "grid");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PlanPicker />);
    await expectNoA11yViolations(container);
  });
});
