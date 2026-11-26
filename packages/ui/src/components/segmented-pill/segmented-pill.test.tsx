import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SegmentedPill } from "./segmented-pill";

describe("SegmentedPill", () => {
  it("is a named radio group with Day, Week and Month, the first selected", () => {
    render(<SegmentedPill aria-label="Range" />);
    expect(screen.getByRole("radiogroup", { name: "Range" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((radio) => radio.textContent)).toEqual([
      "Day",
      "Week",
      "Month",
    ]);
    expect(screen.getByRole("radio", { name: "Day" })).toBeChecked();
  });

  it("selects on click and stretches the thumb toward it", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <SegmentedPill aria-label="Range" onValueChange={onValueChange} />,
    );
    expect(container.querySelector("[data-part=pill]")).not.toHaveAttribute("data-moving");

    await user.click(screen.getByRole("radio", { name: "Month" }));
    expect(onValueChange).toHaveBeenCalledWith("Month");
    expect(screen.getByRole("radio", { name: "Month" })).toBeChecked();
    const root = screen.getByRole("radiogroup");
    expect(root.style.getPropertyValue("--i")).toBe("2");
    expect(container.querySelector("[data-part=pill]")).toHaveAttribute("data-moving");
  });

  it("roves focus with the arrow keys and selects with Space", async () => {
    const user = userEvent.setup();
    render(<SegmentedPill aria-label="Range" defaultValue="Week" />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "Week" })).toHaveFocus();
    // Selection-on-arrow comes from a document listener that jsdom's event
    // order defeats (see radio-group's tests), so assert focus, then Space.
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Month" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("radio", { name: "Month" })).toBeChecked();
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState("b");
      return (
        <>
          <SegmentedPill
            aria-label="Letters"
            options={[
              { value: "a", label: "A" },
              { value: "b", label: "B" },
            ]}
            value={value}
            onValueChange={setValue}
          />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("radio", { name: "B" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "A" }));
    expect(screen.getByRole("status")).toHaveTextContent("a");
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SegmentedPill aria-label="Range" ref={ref} className="w-full" />);
    expect(ref.current).toBe(screen.getByRole("radiogroup"));
    expect(ref.current).toHaveClass("w-full", "bg-muted");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SegmentedPill aria-label="Range" />);
    await expectNoA11yViolations(container);
  });
});
