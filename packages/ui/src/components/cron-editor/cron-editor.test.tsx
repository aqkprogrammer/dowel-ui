import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Cron, CronBuilder, CronExpression, CronNextRuns, type CronProps } from "./cron-editor";
import {
  CronExpressionError,
  describeCron,
  isValidCron,
  nextRuns,
  parseCron,
  zonedTimeToInstant,
} from "./cron-expression";

/** Thursday 3 September 2026, midnight UTC. */
const NOW = new Date("2026-09-03T00:00:00Z");

const iso = (dates: Date[]) => dates.map((d) => d.toISOString());

describe("cron expression model", () => {
  describe("parseCron", () => {
    it("reads the five fields into value sets", () => {
      expect(parseCron("0 9 * * 1")).toMatchObject({
        minutes: [0],
        hours: [9],
        daysOfMonth: Array.from({ length: 31 }, (_, i) => i + 1),
        months: Array.from({ length: 12 }, (_, i) => i + 1),
        daysOfWeek: [1],
        dayOfMonthRestricted: false,
        dayOfWeekRestricted: true,
      });
    });

    it("expands the crontab shortcuts", () => {
      expect(parseCron("@daily").expression).toBe("0 0 * * *");
      expect(parseCron("@WEEKLY").expression).toBe("0 0 * * 0");
      expect(parseCron("@yearly").expression).toBe("0 0 1 1 *");
    });

    it("reads lists, ranges and steps", () => {
      const schedule = parseCron("0,30 9-17 */10 1,6 1-5");
      expect(schedule.minutes).toEqual([0, 30]);
      expect(schedule.hours).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
      expect(schedule.daysOfMonth).toEqual([1, 11, 21, 31]);
      expect(schedule.months).toEqual([1, 6]);
      expect(schedule.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    });

    it("reads month and day names, in any case", () => {
      expect(parseCron("0 0 1 jan,Jul *").months).toEqual([1, 7]);
      expect(parseCron("0 0 * * MON-fri").daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    });

    it("folds 7 into Sunday", () => {
      expect(parseCron("0 0 * * 7").daysOfWeek).toEqual([0]);
      expect(parseCron("0 0 * * 5-7").daysOfWeek).toEqual([0, 5, 6]);
    });

    it("reads a bare number with a step as from-there-onwards", () => {
      expect(parseCron("5/20 * * * *").minutes).toEqual([5, 25, 45]);
    });

    it("says how many fields it expected", () => {
      expect(() => parseCron("0 9 * *")).toThrow(/Expected 5 fields/);
      expect(() => parseCron("0 9 * * * *")).toThrow(/not 6/);
    });

    it("names the field and the bound that was broken", () => {
      expect(() => parseCron("75 9 * * *")).toThrow("Minute must be 0–59, not 75.");
      expect(() => parseCron("0 24 * * *")).toThrow("Hour must be 0–23, not 24.");
      expect(() => parseCron("0 0 32 * *")).toThrow("Day of month must be 1–31, not 32.");
      expect(() => parseCron("0 0 * 13 *")).toThrow("Month must be 1–12, not 13.");
    });

    it("carries which field is wrong on the error", () => {
      try {
        parseCron("0 0 * xyz *");
        expect.unreachable();
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(CronExpressionError);
        expect((thrown as CronExpressionError).field).toBe("month");
        expect((thrown as CronExpressionError).message).toMatch(/not a number or a name/);
      }
    });

    it("rejects a backwards range, a malformed step and an empty item", () => {
      expect(() => parseCron("0 17-9 * * *")).toThrow(/runs backwards/);
      expect(() => parseCron("*/0 * * * *")).toThrow(/step must be a whole number/);
      expect(() => parseCron("0 9 * * 1,")).toThrow(/empty item/);
      expect(() => parseCron("0 9/ * * *")).toThrow(/malformed step/);
    });

    it("rejects an unknown shortcut and names the real ones", () => {
      expect(() => parseCron("@fortnightly")).toThrow(/Try @hourly, @daily/);
    });

    it("asks for something rather than accepting nothing", () => {
      expect(() => parseCron("   ")).toThrow("Enter a schedule.");
      expect(isValidCron("")).toBe(false);
      expect(isValidCron("0 9 * * 1")).toBe(true);
    });
  });

  describe("describeCron", () => {
    const describe_ = (expression: string) => describeCron(expression, { locale: "en-GB" });

    it.each([
      ["* * * * *", "Every minute"],
      ["*/15 * * * *", "Every 15 minutes"],
      ["5 * * * *", "At minute 5 past every hour"],
      ["0 */2 * * *", "At minute 0 past every 2nd hour"],
      ["*/15 9-17 * * *", "Every 15 minutes during 09:00 to 17:00"],
      ["0 9 * * *", "At 09:00 every day"],
      ["@daily", "At 00:00 every day"],
      ["0 9,17 * * *", "At 09:00 and 17:00 every day"],
      ["0 9 * * 1", "At 09:00 on Monday"],
      ["30 8 * * 1-5", "At 08:30 on Monday to Friday"],
      ["0 9 * * 1,3,5", "At 09:00 on Monday, Wednesday and Friday"],
      ["0 0 1 * *", "At 00:00 on day 1 of the month"],
      ["0 0 1,15 * *", "At 00:00 on day 1 and 15 of the month"],
      ["0 0 1 1 *", "At 00:00 on day 1 of the month in January"],
      ["0 0 * 3-5 *", "At 00:00 every day in March to May"],
      ["0 0 */2 * *", "At 00:00 every 2nd day of the month"],
    ])("%s → %s", (expression, expected) => {
      expect(describe_(expression)).toBe(expected);
    });

    it("says OR when both day fields are restricted, because AND is what readers assume", () => {
      expect(describe_("0 12 1 * 1")).toBe("At 12:00 on day 1 of the month, or on Monday");
    });

    it("formats times in the locale", () => {
      expect(describeCron("0 9 * * 1", { locale: "en-US" })).toMatch(/09:00 AM on Monday/);
    });

    it("throws for an invalid expression rather than describing nonsense", () => {
      expect(() => describe_("0 9 * *")).toThrow(CronExpressionError);
    });
  });

  describe("nextRuns", () => {
    it("finds the next occurrences in order", () => {
      expect(iso(nextRuns("0 9 * * 1", { from: NOW, count: 2, timeZone: "UTC" }))).toEqual([
        "2026-09-07T09:00:00.000Z",
        "2026-09-14T09:00:00.000Z",
      ]);
    });

    it("starts strictly after the instant given", () => {
      const from = new Date("2026-09-07T09:00:00Z");
      expect(iso(nextRuns("0 9 * * 1", { from, count: 1, timeZone: "UTC" }))).toEqual([
        "2026-09-14T09:00:00.000Z",
      ]);
    });

    it("runs several times a day in hour then minute order", () => {
      expect(
        iso(nextRuns("0,30 9,17 * * *", { from: NOW, count: 4, timeZone: "UTC" })),
      ).toEqual([
        "2026-09-03T09:00:00.000Z",
        "2026-09-03T09:30:00.000Z",
        "2026-09-03T17:00:00.000Z",
        "2026-09-03T17:30:00.000Z",
      ]);
    });

    it("fires when EITHER day field matches once both are restricted", () => {
      // Cron's rule. Sundays in September 2026 are the 6th, 13th, 20th, 27th;
      // the 1st of October is a Thursday.
      expect(iso(nextRuns("0 0 1 * 0", { from: NOW, count: 5, timeZone: "UTC" }))).toEqual([
        "2026-09-06T00:00:00.000Z",
        "2026-09-13T00:00:00.000Z",
        "2026-09-20T00:00:00.000Z",
        "2026-09-27T00:00:00.000Z",
        "2026-10-01T00:00:00.000Z",
      ]);
    });

    it("counts in the zone given", () => {
      // 09:00 in Kolkata is 03:30 UTC.
      expect(
        iso(nextRuns("0 9 * * *", { from: NOW, count: 1, timeZone: "Asia/Kolkata" })),
      ).toEqual(["2026-09-03T03:30:00.000Z"]);
    });

    it("skips a wall-clock time that does not exist on the day the clocks go forward", () => {
      // London springs forward at 01:00 on 28 March 2027; 01:30 never happens.
      const from = new Date("2027-03-27T12:00:00Z");
      expect(
        iso(nextRuns("30 1 * * *", { from, count: 2, timeZone: "Europe/London" })),
      ).toEqual(["2027-03-29T00:30:00.000Z", "2027-03-30T00:30:00.000Z"]);
    });

    it("runs an ambiguous autumn time once, at its first occurrence", () => {
      // London falls back at 02:00 BST on 25 October 2026; 01:30 happens twice.
      const from = new Date("2026-10-24T12:00:00Z");
      expect(
        iso(nextRuns("30 1 * * *", { from, count: 2, timeZone: "Europe/London" })),
      ).toEqual(["2026-10-25T00:30:00.000Z", "2026-10-26T01:30:00.000Z"]);
    });

    it("returns fewer than asked when the schedule cannot supply them", () => {
      expect(nextRuns("0 0 30 2 *", { from: NOW, count: 3, timeZone: "UTC" })).toEqual([]);
      expect(nextRuns("0 0 29 2 *", { from: NOW, count: 3, timeZone: "UTC" })).toHaveLength(1);
    });

    it("throws for an invalid expression", () => {
      expect(() => nextRuns("nope", { from: NOW })).toThrow(CronExpressionError);
    });
  });

  describe("zonedTimeToInstant", () => {
    it("converts a wall-clock time in a zone to an instant", () => {
      expect(zonedTimeToInstant(2026, 9, 3, 9, 0, "Asia/Kolkata")).toBe(
        Date.parse("2026-09-03T03:30:00Z"),
      );
    });

    it("returns null for a time the clocks skip", () => {
      expect(zonedTimeToInstant(2027, 3, 28, 1, 30, "Europe/London")).toBeNull();
    });
  });
});

function Editor(props: Partial<CronProps> = {}) {
  return (
    <Cron now={NOW} timeZone="UTC" locale="en-GB" {...props}>
      <CronBuilder />
      <CronExpression />
      <CronNextRuns />
    </Cron>
  );
}

const expression = () => screen.getByLabelText("Expression");
const frequency = () => screen.getByRole("combobox", { name: "Frequency" });

describe("CronEditor", () => {
  it("shows the expression with its reading as the field's description", () => {
    render(<Editor />);

    expect(expression()).toHaveValue("0 9 * * 1");
    expect(expression()).toHaveAccessibleDescription("At 09:00 on Monday");
  });

  it("lists the next runs with machine-readable times, headed by the zone", () => {
    render(<Editor />);

    const list = screen.getByRole("list", { name: /Next 5 runs/ });
    const times = within(list)
      .getAllByRole("listitem")
      .map((item) => item.querySelector("time"));
    expect(times).toHaveLength(5);
    expect(times[0]).toHaveAttribute("dateTime", "2026-09-07T09:00:00.000Z");
    expect(times[0]).toHaveTextContent("7 Sept 2026, 09:00");
    expect(screen.getByText(/Next 5 runs/)).toHaveTextContent("UTC");
  });

  it("says when a schedule never runs rather than showing an empty list", () => {
    render(<Editor defaultValue="0 0 30 2 *" />);
    expect(screen.getByText(/Never runs/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders nothing clock-dependent until the clock is known", () => {
    const markup = renderToStaticMarkup(
      <Cron timeZone="UTC">
        <CronExpression />
        <CronNextRuns />
      </Cron>,
    );

    expect(markup).not.toContain("<time");
    expect(markup).toContain("0 9 * * 1");
  });

  describe("the expression field", () => {
    it("applies a valid expression as it is typed", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Editor onValueChange={onValueChange} />);

      await user.clear(expression());
      await user.type(expression(), "*/5 * * * *");

      expect(onValueChange).toHaveBeenLastCalledWith("*/5 * * * *");
      expect(expression()).toHaveAccessibleDescription("Every 5 minutes");
    });

    it("says why an entry is invalid and does not apply it", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Editor onValueChange={onValueChange} />);

      await user.clear(expression());
      await user.type(expression(), "75 9 * * 1");

      expect(expression()).toHaveAttribute("aria-invalid", "true");
      expect(expression()).toHaveAccessibleDescription("Minute must be 0–59, not 75.");
      expect(onValueChange).not.toHaveBeenCalledWith("75 9 * * 1");
    });

    it("keeps the last valid schedule in the next runs while the entry is invalid", async () => {
      const user = userEvent.setup();
      render(<Editor />);

      await user.type(expression(), "x");

      expect(expression()).toHaveValue("0 9 * * 1x");
      expect(screen.getByRole("list", { name: /Next 5 runs/ })).toBeInTheDocument();
    });

    it("uses one element for the reading and the error, so one replaces the other", async () => {
      const user = userEvent.setup();
      render(<Editor />);

      const before = expression().getAttribute("aria-describedby");
      await user.type(expression(), "x");
      expect(expression().getAttribute("aria-describedby")).toBe(before);
    });

    it("follows the builder", async () => {
      const user = userEvent.setup();
      render(<Editor />);

      await user.click(screen.getByRole("button", { name: "Friday" }));
      expect(expression()).toHaveValue("0 9 * * 1,5");
    });
  });

  describe("the builder", () => {
    it("recognises the shape of the expression", () => {
      const { rerender } = render(<Editor />);
      expect(frequency()).toHaveTextContent("Every week");
      expect(screen.getByRole("button", { name: "Monday" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: "Tuesday" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(screen.getByLabelText("At")).toHaveValue("09:00");

      rerender(<Editor value="30 2 15 * *" />);
      expect(frequency()).toHaveTextContent("Every month");
      expect(screen.getByLabelText("On day")).toHaveValue(15);
      expect(screen.getByLabelText("At")).toHaveValue("02:30");
    });

    it("calls what it cannot express custom, and points at the expression", () => {
      render(<Editor defaultValue="*/15 9-17 * * *" />);

      expect(frequency()).toHaveTextContent("Custom");
      expect(screen.getByText(/needs the expression/)).toBeInTheDocument();
      expect(screen.queryByLabelText("At")).not.toBeInTheDocument();
    });

    it("changes the frequency, keeping the time", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Editor defaultValue="30 8 * * 1" onValueChange={onValueChange} />);

      await user.click(frequency());
      await user.click(await screen.findByRole("option", { name: "Every month" }));

      expect(onValueChange).toHaveBeenLastCalledWith("30 8 1 * *");
      expect(screen.getByLabelText("At")).toHaveValue("08:30");
    });

    it("writes a step for every-N frequencies", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Editor defaultValue="* * * * *" onValueChange={onValueChange} />);

      const step = screen.getByLabelText("Every how many minutes");
      await user.clear(step);
      await user.type(step, "15");

      expect(onValueChange).toHaveBeenLastCalledWith("*/15 * * * *");
    });

    it("changes the time", () => {
      const onValueChange = vi.fn();
      render(<Editor onValueChange={onValueChange} />);

      // A change event rather than typing: jsdom has no time picker to type
      // into, and the value a real one produces is the whole "HH:MM".
      fireEvent.change(screen.getByLabelText("At"), { target: { value: "17:45" } });

      expect(onValueChange).toHaveBeenLastCalledWith("45 17 * * 1");
    });

    it("toggles days as a named group of pressed buttons, sorted into the expression", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Editor defaultValue="0 9 * * 3" onValueChange={onValueChange} />);

      expect(screen.getByRole("group", { name: "On" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Monday" }));
      expect(onValueChange).toHaveBeenLastCalledWith("0 9 * * 1,3");

      await user.click(screen.getByRole("button", { name: "Wednesday" }));
      expect(onValueChange).toHaveBeenLastCalledWith("0 9 * * 1");
    });

    it("writes consecutive days as a range, the way people write it", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Editor defaultValue="0 9 * * 1-4" onValueChange={onValueChange} />);

      await user.click(screen.getByRole("button", { name: "Friday" }));
      expect(onValueChange).toHaveBeenLastCalledWith("0 9 * * 1-5");

      // Sunday is 0, so Sunday to Friday is one run.
      await user.click(screen.getByRole("button", { name: "Sunday" }));
      expect(onValueChange).toHaveBeenLastCalledWith("0 9 * * 0-5");

      await user.click(screen.getByRole("button", { name: "Wednesday" }));
      expect(onValueChange).toHaveBeenLastCalledWith("0 9 * * 0-2,4,5");
    });

    it("keeps the last day, and says so rather than refusing silently", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Editor onValueChange={onValueChange} />);

      await user.click(screen.getByRole("button", { name: "Monday" }));

      expect(onValueChange).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Monday" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("group", { name: "On" })).toHaveAccessibleDescription(
        "Pick at least one day.",
      );
    });

    it("warns in text that short months skip day 29 to 31", async () => {
      const user = userEvent.setup();
      render(<Editor defaultValue="0 9 1 * *" />);

      expect(screen.queryByText(/skip this run/)).not.toBeInTheDocument();

      await user.clear(screen.getByLabelText("On day"));
      await user.type(screen.getByLabelText("On day"), "31");

      expect(screen.getByLabelText("On day")).toHaveAccessibleDescription(
        "Months with fewer days skip this run.",
      );
    });

    it("ignores a number outside the field's range", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Editor defaultValue="0 9 1 * *" onValueChange={onValueChange} />);

      await user.clear(screen.getByLabelText("On day"));
      await user.type(screen.getByLabelText("On day"), "40");

      expect(onValueChange).not.toHaveBeenCalledWith(expect.stringContaining("40"));
    });

    it("picks the month for a yearly schedule", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Editor defaultValue="0 9 1 1 *" onValueChange={onValueChange} />);

      expect(frequency()).toHaveTextContent("Every year");
      await user.click(screen.getByRole("combobox", { name: "In" }));
      await user.click(await screen.findByRole("option", { name: "July" }));

      expect(onValueChange).toHaveBeenLastCalledWith("0 9 1 7 *");
    });
  });

  it("works controlled", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Editor value="0 9 * * 1" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("button", { name: "Friday" }));
    expect(onValueChange).toHaveBeenCalledWith("0 9 * * 1,5");
    expect(expression()).toHaveValue("0 9 * * 1");

    rerender(<Editor value="0 9 * * 1,5" onValueChange={onValueChange} />);
    expect(expression()).toHaveValue("0 9 * * 1,5");
  });

  it("names the zone it counts in, or says local time", () => {
    const { rerender } = render(<Editor timeZone="Europe/London" />);
    expect(screen.getByText(/Next 5 runs/)).toHaveTextContent("Europe/London");

    rerender(<Editor timeZone={undefined} />);
    expect(screen.getByText(/Next 5 runs/)).toHaveTextContent("local time");
  });

  it("throws a clear error when a part is used outside Cron", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<CronExpression />)).toThrow(
      "CronExpression must be used inside <Cron>.",
    );
    spy.mockRestore();
  });

  it("lets a className override win a conflict", () => {
    const { container } = render(<Editor className="gap-8" />);
    const root = container.querySelector("[data-slot='cron-editor']");
    expect(root).toHaveClass("gap-8");
    expect(root).not.toHaveClass("gap-4");
  });

  it("forwards a ref and native attributes", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Editor ref={ref} data-testid="editor" />);
    expect(ref.current).toBe(screen.getByTestId("editor"));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Editor />);
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations with an invalid entry and a day warning", async () => {
    const user = userEvent.setup();
    const { container } = render(<Editor defaultValue="0 9 31 * *" />);
    await user.type(expression(), "x");
    await expectNoA11yViolations(container);
  });
});
