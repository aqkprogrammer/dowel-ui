import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DatePicker, DateRangePicker } from "./date-picker";

const JANUARY_2026 = new Date(2026, 0, 15);

function dayButton(iso: string): HTMLElement {
  const cell = document.querySelector<HTMLElement>(`[data-day="${iso}"]`);
  if (!cell) throw new Error(`No day cell for ${iso}`);
  return within(cell).getByRole("button");
}

describe("DatePicker", () => {
  it("shows the placeholder until a date is picked", () => {
    render(<DatePicker />);
    expect(screen.getByRole("button")).toHaveTextContent("Pick a date");
  });

  it("formats the selected date for the locale", () => {
    render(<DatePicker value={JANUARY_2026} locale="en-GB" />);
    expect(screen.getByRole("button")).toHaveTextContent("15 Jan 2026");
  });

  it("formats differently for a different locale", () => {
    render(<DatePicker value={JANUARY_2026} locale="en-US" />);
    expect(screen.getByRole("button")).toHaveTextContent("Jan 15, 2026");
  });

  it("opens the calendar from its trigger", async () => {
    const user = userEvent.setup();
    render(<DatePicker />);

    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("grid")).toBeInTheDocument();
  });

  it("names the popover, which carries a dialog role", async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Choose a start date" />);

    await user.click(screen.getByRole("button"));
    expect(
      await screen.findByRole("dialog", { name: "Choose a start date" }),
    ).toBeInTheDocument();
  });

  it("reports and displays the picked date, then closes", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DatePicker defaultValue={JANUARY_2026} onValueChange={onValueChange} locale="en-GB" />,
    );

    await user.click(screen.getByRole("button"));
    await screen.findByRole("grid");
    await user.click(dayButton("2026-01-20"));

    expect(onValueChange).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button")).toHaveTextContent("20 Jan 2026");
  });

  it("returns focus to the trigger after picking", async () => {
    const user = userEvent.setup();
    render(<DatePicker defaultValue={JANUARY_2026} />);

    const trigger = screen.getByRole("button");
    await user.click(trigger);
    await screen.findByRole("grid");
    await user.click(dayButton("2026-01-20"));

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("works controlled", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [date, setDate] = useState<Date | undefined>(JANUARY_2026);
      return <DatePicker value={date} onValueChange={setDate} locale="en-GB" />;
    }

    render(<Controlled />);
    expect(screen.getByRole("button")).toHaveTextContent("15 Jan 2026");

    await user.click(screen.getByRole("button"));
    await screen.findByRole("grid");
    await user.click(dayButton("2026-01-22"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("22 Jan 2026");
    });
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<DatePicker />);

    await user.click(screen.getByRole("button"));
    await screen.findByRole("grid");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });
  });

  it("does not open while disabled", async () => {
    const user = userEvent.setup();
    render(<DatePicker disabled />);

    const trigger = screen.getByRole("button");
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<DatePicker defaultValue={JANUARY_2026} />);

    await user.click(screen.getByRole("button"));
    await screen.findByRole("grid");

    await expectNoA11yViolations(baseElement);
  });
});

describe("DateRangePicker", () => {
  it("shows the placeholder until a range is picked", () => {
    render(<DateRangePicker />);
    expect(screen.getByRole("button")).toHaveTextContent("Pick a date range");
  });

  it("shows both ends of the range", () => {
    render(
      <DateRangePicker
        value={{ from: new Date(2026, 0, 10), to: new Date(2026, 0, 14) }}
        locale="en-GB"
      />,
    );
    expect(screen.getByRole("button")).toHaveTextContent("10 Jan 2026 – 14 Jan 2026");
  });

  it("shows two months so most ranges need no paging", async () => {
    const user = userEvent.setup();
    render(<DateRangePicker value={{ from: JANUARY_2026, to: undefined }} />);

    await user.click(screen.getByRole("button"));
    await screen.findByRole("dialog");
    expect(screen.getByText(/january 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/february 2026/i)).toBeInTheDocument();
  });

  it("stays open after the first click, since one click is half an answer", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [range, setRange] = useState<DateRange | undefined>();
      return <DateRangePicker value={range} onValueChange={setRange} numberOfMonths={1} />;
    }

    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: /pick a date range/i }));
    await screen.findByRole("grid");

    // An empty range picker opens on the current month, so the days are taken
    // from what is actually rendered rather than from a hard-coded date.
    const days = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-day]:not([data-outside]):not([data-hidden])",
      ),
    );
    const first = within(days[9]!).getByRole("button");
    const second = within(days[13]!).getByRole("button");

    await user.click(first);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(second);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /–/ })).toBeInTheDocument();
    });
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<DateRangePicker />);

    await user.click(screen.getByRole("button"));
    await screen.findByRole("dialog");

    await expectNoA11yViolations(baseElement);
  });
});
