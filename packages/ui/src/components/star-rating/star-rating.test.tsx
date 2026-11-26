import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { StarRating } from "./star-rating";

describe("StarRating", () => {
  it("is a radio group of named stars", () => {
    render(<StarRating />);
    expect(screen.getByRole("radiogroup", { name: "Rating" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "3 stars, Good" })).not.toBeChecked();
    expect(screen.getByText("No rating")).toBeInTheDocument();
  });

  it("selects on click and shows the caption", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<StarRating onValueChange={onValueChange} />);

    await user.click(screen.getByRole("radio", { name: "5 stars, Loved it" }));
    expect(onValueChange).toHaveBeenCalledWith(5);
    expect(screen.getByRole("radio", { name: "5 stars, Loved it" })).toBeChecked();
    expect(screen.getByText("5.0 · Loved it")).toBeInTheDocument();
  });

  it("moves the rating with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<StarRating defaultValue={3} />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "3 stars, Good" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    // Radix also checks on arrow in a real browser; under jsdom's focus timing
    // only the move is observable, so Space commits it here.
    const next = screen.getByRole("radio", { name: "4 stars, Great" });
    expect(next).toHaveFocus();
    await user.keyboard(" ");
    expect(next).toBeChecked();
    expect(screen.getByText("4.0 · Great")).toBeInTheDocument();
  });

  it("lights stars up to the value and pops them only after a change", async () => {
    const user = userEvent.setup();
    const { container } = render(<StarRating defaultValue={3} />);
    const lit = () => container.querySelectorAll("[data-slot=star-rating-item][data-lit]");
    expect(lit()).toHaveLength(3);
    expect(container.querySelector("[data-animate]")).toBeNull();

    await user.click(screen.getByRole("radio", { name: "2 stars, Meh" }));
    await user.unhover(screen.getByRole("radio", { name: "2 stars, Meh" }));
    expect(lit()).toHaveLength(2);
    expect(container.querySelectorAll("[data-animate]")).toHaveLength(2);
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState(1);
      return (
        <>
          <StarRating value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole("radio", { name: "4 stars, Great" }));
    expect(screen.getByRole("status")).toHaveTextContent("4");
  });

  it("uses custom labels for the count and names", () => {
    render(<StarRating labels={["Poor", "Fair", "Good"]} defaultValue={2} />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "2 stars, Fair" })).toBeChecked();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(<StarRating ref={ref} className="custom" />);
    expect(ref.current).toBe(screen.getByRole("radiogroup"));
    expect(ref.current).toHaveClass("custom", "inline-flex");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<StarRating defaultValue={3} />);
    await expectNoA11yViolations(container);
  });
});
