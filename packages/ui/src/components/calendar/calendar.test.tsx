import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Calendar } from "./calendar";

/** January 2026 — a fixed month so the tests never depend on today's date. */
const JANUARY_2026 = new Date(2026, 0, 1);

function dayButton(container: HTMLElement, iso: string): HTMLElement {
  const cell = container.querySelector<HTMLElement>(`[data-day="${iso}"]`);
  if (!cell) throw new Error(`No day cell for ${iso}`);
  return within(cell).getByRole("button");
}

describe("Calendar", () => {
  it("renders a date grid", () => {
    render(<Calendar mode="single" defaultMonth={JANUARY_2026} />);
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(27);
  });

  it("shows the month it was given", () => {
    render(<Calendar mode="single" defaultMonth={JANUARY_2026} />);
    expect(screen.getByText(/january 2026/i)).toBeInTheDocument();
  });

  it("selects a day on click", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Calendar mode="single" defaultMonth={JANUARY_2026} onSelect={onSelect} />,
    );

    await user.click(dayButton(container, "2026-01-15"));
    expect(onSelect).toHaveBeenCalled();
    expect(onSelect.mock.calls[0]?.[0]).toBeInstanceOf(Date);
  });

  it("marks the selected day", () => {
    const { container } = render(
      <Calendar mode="single" defaultMonth={JANUARY_2026} selected={new Date(2026, 0, 15)} />,
    );

    const cell = container.querySelector('[data-day="2026-01-15"]');
    expect(cell).toHaveAttribute("data-selected", "true");
  });

  it("navigates to the next and previous month", async () => {
    const user = userEvent.setup();
    render(<Calendar mode="single" defaultMonth={JANUARY_2026} />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText(/february 2026/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /previous/i }));
    await waitFor(() => {
      expect(screen.getByText(/january 2026/i)).toBeInTheDocument();
    });
  });

  it("announces the visible month in a live region", () => {
    render(<Calendar mode="single" defaultMonth={JANUARY_2026} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("moves through the grid with the arrow keys", async () => {
    const user = userEvent.setup();
    const { container } = render(<Calendar mode="single" defaultMonth={JANUARY_2026} />);

    const start = dayButton(container, "2026-01-15");
    start.focus();
    expect(start).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(dayButton(container, "2026-01-16")).toHaveFocus();

    // Down moves a whole week, which is what makes the grid a grid.
    await user.keyboard("{ArrowDown}");
    expect(dayButton(container, "2026-01-23")).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(dayButton(container, "2026-01-22")).toHaveFocus();
  });

  it("selects the focused day with Enter", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Calendar mode="single" defaultMonth={JANUARY_2026} onSelect={onSelect} />,
    );

    dayButton(container, "2026-01-15").focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalled();
  });

  it("disables days that are not allowed", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Calendar
        mode="single"
        defaultMonth={JANUARY_2026}
        disabled={{ before: new Date(2026, 0, 10) }}
        onSelect={onSelect}
      />,
    );

    const early = dayButton(container, "2026-01-05");
    expect(early).toBeDisabled();
    await user.click(early);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("marks days outside the visible month", () => {
    const { container } = render(<Calendar mode="single" defaultMonth={JANUARY_2026} />);
    expect(container.querySelector('[data-outside="true"]')).toBeInTheDocument();
  });

  it("can hide days outside the visible month", () => {
    const { container } = render(
      <Calendar mode="single" defaultMonth={JANUARY_2026} showOutsideDays={false} />,
    );

    // The cells stay, so the grid keeps its shape; they are marked hidden and
    // render no button, which is what removes them from the keyboard path.
    const hidden = container.querySelectorAll('[data-hidden="true"]');
    expect(hidden.length).toBeGreaterThan(0);
    for (const cell of hidden) {
      expect(within(cell as HTMLElement).queryByRole("button")).not.toBeInTheDocument();
    }
  });

  it("supports range selection", async () => {
    const user = userEvent.setup();

    function RangeExample() {
      const [range, setRange] = useState<DateRange | undefined>();
      return (
        <>
          <Calendar
            mode="range"
            defaultMonth={JANUARY_2026}
            selected={range}
            onSelect={setRange}
          />
          {/* A plain span, not <output>: <output> carries an implicit
              role="status", which would collide with the calendar's own live
              region. */}
          <span data-testid="range">
            {range?.from ? `${range.from.getDate()}-${String(range.to?.getDate())}` : "none"}
          </span>
        </>
      );
    }

    const { container } = render(<RangeExample />);
    expect(screen.getByTestId("range")).toHaveTextContent("none");

    // The first click produces a one-day range, not a half-open one: `to` is
    // set to the same day. The second click extends it.
    await user.click(dayButton(container, "2026-01-10"));
    await waitFor(() => {
      expect(screen.getByTestId("range")).toHaveTextContent("10-10");
    });

    await user.click(dayButton(container, "2026-01-14"));
    await waitFor(() => {
      expect(screen.getByTestId("range")).toHaveTextContent("10-14");
    });
  });

  it("marks the days between the ends of a range", async () => {
    const user = userEvent.setup();

    function RangeExample() {
      const [range, setRange] = useState<DateRange | undefined>();
      return (
        <Calendar
          mode="range"
          defaultMonth={JANUARY_2026}
          selected={range}
          onSelect={setRange}
        />
      );
    }

    const { container } = render(<RangeExample />);
    await user.click(dayButton(container, "2026-01-10"));
    await user.click(dayButton(container, "2026-01-14"));

    await waitFor(() => {
      expect(container.querySelector('[data-day="2026-01-12"]')).toHaveAttribute(
        "data-selected",
        "true",
      );
    });
    expect(container.querySelector('[data-day="2026-01-16"]')).not.toHaveAttribute(
      "data-selected",
    );
  });

  it("shows more than one month when asked", () => {
    render(<Calendar mode="single" defaultMonth={JANUARY_2026} numberOfMonths={2} />);
    expect(screen.getByText(/january 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/february 2026/i)).toBeInTheDocument();
  });

  it("merges a consumer className", () => {
    const { container } = render(
      <Calendar mode="single" defaultMonth={JANUARY_2026} className="p-6" />,
    );
    expect(container.querySelector(".rdp-root")).toHaveClass("p-6");
  });

  it("lets a consumer override a generated classNames entry", () => {
    const { container } = render(
      <Calendar
        mode="single"
        defaultMonth={JANUARY_2026}
        classNames={{ day: "custom-day-class" }}
      />,
    );
    expect(container.querySelector(".custom-day-class")).toBeInTheDocument();
  });

  it("renders dropdown navigation with its own chevrons", () => {
    render(
      <Calendar
        mode="single"
        defaultMonth={JANUARY_2026}
        captionLayout="dropdown"
        startMonth={new Date(2024, 0)}
        endMonth={new Date(2028, 11)}
      />,
    );

    // Dropdown captions render comboboxes for month and year, each with a
    // downward chevron — a different orientation from the nav arrows.
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(2);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Calendar mode="single" defaultMonth={JANUARY_2026} aria-label="Event date" />,
    );
    await expectNoA11yViolations(container);
  });
});
