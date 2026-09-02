import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  DEFAULT_PRESETS,
  TimeExpressionError,
  absoluteExpression,
  describeTimeRange,
  formatResolvedRange,
  isValidTimeRange,
  resolveTimeRange,
} from "./time-expression";
import {
  TimeRange,
  TimeRangeCalendar,
  TimeRangeContent,
  TimeRangeExpression,
  TimeRangePresets,
  TimeRangeTrigger,
} from "./time-range-picker";

/** A Wednesday, mid-afternoon, mid-month — no boundary is nearby by accident. */
const NOW = new Date("2026-06-17T14:37:29.512Z");
const UTC = { now: NOW, timeZone: "UTC" };

function iso(date: Date): string {
  return date.toISOString();
}

describe("resolveTimeRange", () => {
  it("resolves a relative range against the given now", () => {
    const { from, to } = resolveTimeRange("now-6h..now", UTC);

    expect(iso(from)).toBe("2026-06-17T08:37:29.512Z");
    expect(iso(to)).toBe(iso(NOW));
  });

  it("never reads the clock itself", () => {
    // Two calls a day apart must agree, or the component would disagree with
    // itself between the server and the browser.
    const later = { now: new Date("2026-06-18T14:37:29.512Z"), timeZone: "UTC" };

    expect(iso(resolveTimeRange("now-1h..now", UTC).from)).toBe("2026-06-17T13:37:29.512Z");
    expect(iso(resolveTimeRange("now-1h..now", later).from)).toBe("2026-06-18T13:37:29.512Z");
  });

  it("applies several offsets in sequence", () => {
    expect(iso(resolveTimeRange("now-1d-2h..now", UTC).from)).toBe("2026-06-16T12:37:29.512Z");
  });

  it("accepts a forward offset", () => {
    expect(iso(resolveTimeRange("now..now+1h", UTC).to)).toBe("2026-06-17T15:37:29.512Z");
  });

  describe("snapping", () => {
    it("floors the opening side", () => {
      expect(iso(resolveTimeRange("now/h..now", UTC).from)).toBe("2026-06-17T14:00:00.000Z");
    });

    it("climbs to the end of the unit on the closing side", () => {
      // The detail every reimplementation gets wrong: flooring both sides makes
      // `now/d..now/d` a range of zero length and a chart with nothing in it.
      const { from, to } = resolveTimeRange("now/d..now/d", UTC);

      expect(iso(from)).toBe("2026-06-17T00:00:00.000Z");
      expect(iso(to)).toBe("2026-06-17T23:59:59.999Z");
    });

    it("resolves yesterday as a whole day", () => {
      const { from, to } = resolveTimeRange("now-1d/d..now-1d/d", UTC);

      expect(iso(from)).toBe("2026-06-16T00:00:00.000Z");
      expect(iso(to)).toBe("2026-06-16T23:59:59.999Z");
    });

    it("snaps weeks to Monday", () => {
      // 17 June 2026 is a Wednesday.
      expect(iso(resolveTimeRange("now/w..now", UTC).from)).toBe("2026-06-15T00:00:00.000Z");
    });

    it("snaps a Monday to itself rather than back a week", () => {
      const monday = { now: new Date("2026-06-15T09:00:00.000Z"), timeZone: "UTC" };
      expect(iso(resolveTimeRange("now/w..now", monday).from)).toBe("2026-06-15T00:00:00.000Z");
    });

    it("snaps a Sunday back to the Monday that opened its week", () => {
      const sunday = { now: new Date("2026-06-21T09:00:00.000Z"), timeZone: "UTC" };
      expect(iso(resolveTimeRange("now/w..now", sunday).from)).toBe("2026-06-15T00:00:00.000Z");
    });

    it("snaps months and years", () => {
      expect(iso(resolveTimeRange("now/M..now", UTC).from)).toBe("2026-06-01T00:00:00.000Z");
      expect(iso(resolveTimeRange("now/y..now", UTC).from)).toBe("2026-01-01T00:00:00.000Z");
    });

    it("closes a month on its real last day", () => {
      expect(iso(resolveTimeRange("now/M..now/M", UTC).to)).toBe("2026-06-30T23:59:59.999Z");
    });

    it("snaps after applying the offset, not before", () => {
      // `now-1M/M` is the whole of last month; snapping first would give the
      // start of this one and then step back an arbitrary distance.
      const { from, to } = resolveTimeRange("now-1M/M..now-1M/M", UTC);

      expect(iso(from)).toBe("2026-05-01T00:00:00.000Z");
      expect(iso(to)).toBe("2026-05-31T23:59:59.999Z");
    });
  });

  describe("calendar arithmetic", () => {
    it("clamps a month step onto a shorter month", () => {
      // 31 March minus one month is the end of February, not 3 March.
      const march31 = { now: new Date("2026-03-31T12:00:00.000Z"), timeZone: "UTC" };
      expect(iso(resolveTimeRange("now-1M..now", march31).from)).toBe(
        "2026-02-28T12:00:00.000Z",
      );
    });

    it("lands on 29 February in a leap year", () => {
      const march31 = { now: new Date("2028-03-31T12:00:00.000Z"), timeZone: "UTC" };
      expect(iso(resolveTimeRange("now-1M..now", march31).from)).toBe(
        "2028-02-29T12:00:00.000Z",
      );
    });

    it("steps a year across a leap day without inventing 29 February", () => {
      const leapDay = { now: new Date("2028-02-29T12:00:00.000Z"), timeZone: "UTC" };
      expect(iso(resolveTimeRange("now-1y..now", leapDay).from)).toBe(
        "2027-02-28T12:00:00.000Z",
      );
    });
  });

  describe("time zones", () => {
    it("snaps to the day boundary of the given zone, not the runtime's", () => {
      // 14:37 UTC is already past midnight on the 18th in Auckland.
      const { from } = resolveTimeRange("now/d..now", {
        now: NOW,
        timeZone: "Pacific/Auckland",
      });
      expect(iso(from)).toBe("2026-06-17T12:00:00.000Z");
    });

    it("puts the same expression at different instants in different zones", () => {
      const auckland = resolveTimeRange("now/d..now", {
        now: NOW,
        timeZone: "Pacific/Auckland",
      });
      const denver = resolveTimeRange("now/d..now", { now: NOW, timeZone: "America/Denver" });

      expect(iso(auckland.from)).not.toBe(iso(denver.from));
    });

    it("keeps a day step at the same wall-clock time across a DST change", () => {
      // 8 March 2026 is when US clocks spring forward; a fixed 24 hours would
      // land an hour out.
      const afterSpringForward = {
        now: new Date("2026-03-09T18:00:00.000Z"),
        timeZone: "America/Denver",
      };
      const { from } = resolveTimeRange("now-1d..now", afterSpringForward);
      const wall = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Denver",
        hour: "2-digit",
        hour12: false,
      }).format(from);

      expect(wall).toBe(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Denver",
          hour: "2-digit",
          hour12: false,
        }).format(afterSpringForward.now),
      );
    });
  });

  describe("absolute times", () => {
    it("accepts a full ISO instant", () => {
      expect(iso(resolveTimeRange("2026-01-01T00:00:00Z..now", UTC).from)).toBe(
        "2026-01-01T00:00:00.000Z",
      );
    });

    it("reads a bare date in the given zone rather than as UTC", () => {
      const { from } = resolveTimeRange("2026-01-15..now", {
        now: NOW,
        timeZone: "Asia/Kolkata",
      });
      expect(iso(from)).toBe("2026-01-14T18:30:00.000Z");
    });

    it("takes a bare closing date to mean the whole of that day", () => {
      // Otherwise `2026-01-01..2026-01-31` silently drops the last day.
      expect(iso(resolveTimeRange("2026-01-01..2026-01-31", UTC).to)).toBe(
        "2026-01-31T23:59:59.999Z",
      );
    });

    it("mixes an absolute start with a relative end", () => {
      const { from, to } = resolveTimeRange("2026-06-01..now", UTC);
      expect(iso(from)).toBe("2026-06-01T00:00:00.000Z");
      expect(iso(to)).toBe(iso(NOW));
    });
  });

  describe("refusing bad input", () => {
    it("rejects a range with no separator", () => {
      expect(() => resolveTimeRange("now-6h", UTC)).toThrow(TimeExpressionError);
    });

    it("rejects an unknown unit", () => {
      expect(() => resolveTimeRange("now-6q..now", UTC)).toThrow(/offset like -6h/);
    });

    it("rejects an unknown snap unit", () => {
      expect(() => resolveTimeRange("now/q..now", UTC)).toThrow(/not a unit/);
    });

    it("rejects an anchor that is not now or a date", () => {
      expect(() => resolveTimeRange("yesterday..now", UTC)).toThrow(/Expected "now"/);
    });

    it("rejects an empty side", () => {
      expect(() => resolveTimeRange("..now", UTC)).toThrow(/Enter a time/);
    });

    it("rejects a range that ends before it starts", () => {
      expect(() => resolveTimeRange("now..now-1h", UTC)).toThrow(/ends before it starts/);
    });

    it("rejects an impossible date", () => {
      expect(() => resolveTimeRange("2026-02-30T00:00:00Z..now", UTC)).toThrow(
        TimeExpressionError,
      );
    });

    it("carries the offending input on the error", () => {
      try {
        resolveTimeRange("now-6q..now", UTC);
        expect.unreachable("should have thrown");
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(TimeExpressionError);
        expect((thrown as TimeExpressionError).input).toContain("6q");
      }
    });
  });

  it("resolves every shipped preset", () => {
    for (const preset of DEFAULT_PRESETS) {
      expect(() => resolveTimeRange(preset.expression, UTC)).not.toThrow();
    }
  });

  it("gives every shipped preset a non-empty window", () => {
    for (const preset of DEFAULT_PRESETS) {
      const { from, to } = resolveTimeRange(preset.expression, UTC);
      expect(to.getTime()).toBeGreaterThan(from.getTime());
    }
  });
});

describe("isValidTimeRange", () => {
  it("answers without a try/catch at the call site", () => {
    expect(isValidTimeRange("now-6h..now", UTC)).toBe(true);
    expect(isValidTimeRange("now-6q..now", UTC)).toBe(false);
  });
});

describe("describeTimeRange", () => {
  it("uses a preset's own name", () => {
    expect(describeTimeRange("now-6h..now", UTC)).toBe("Last 6 hours");
    expect(describeTimeRange("now/d..now/d", UTC)).toBe("Today");
  });

  it("describes an unnamed relative range in its own terms", () => {
    // Not as two timestamps: that would throw away what the user chose.
    expect(describeTimeRange("now-90m..now", UTC)).toBe("Last 90 minutes");
  });

  it("singularises", () => {
    expect(describeTimeRange("now-1d..now", UTC)).toBe("Last 1 day");
  });

  it("ignores a snap when naming a relative range", () => {
    expect(describeTimeRange("now-6h/h..now", UTC)).toBe("Last 6 hours");
  });

  it("falls back to dates only for an absolute range", () => {
    const described = describeTimeRange("2026-01-01..2026-01-31", { ...UTC, locale: "en-US" });
    expect(described).toMatch(/Jan 1, 2026/);
    expect(described).toMatch(/Jan 31, 2026/);
  });

  it("returns an unparseable expression unchanged rather than inventing one", () => {
    expect(describeTimeRange("nonsense", UTC)).toBe("nonsense");
  });
});

describe("absoluteExpression", () => {
  it("round-trips through the parser", () => {
    const from = new Date(2026, 2, 1, 0, 0, 0);
    const to = new Date(2026, 2, 7, 23, 59, 59);
    const expression = absoluteExpression(from, to);

    const resolved = resolveTimeRange(expression, { now: NOW });
    expect(resolved.from.getTime()).toBe(from.getTime());
    expect(resolved.to.getTime()).toBe(to.getTime());
  });
});

describe("formatResolvedRange", () => {
  it("spells out both ends", () => {
    const text = formatResolvedRange(resolveTimeRange("now-1h..now", UTC), {
      locale: "en-US",
      timeZone: "UTC",
    });
    expect(text).toContain("–");
    expect(text).toMatch(/Jun 17, 2026/);
  });
});

/* ------------------------------------------------------------------ */

function Picker(props: Partial<React.ComponentProps<typeof TimeRange>> = {}) {
  return (
    <TimeRange now={NOW} timeZone="UTC" locale="en-US" {...props}>
      <TimeRangeTrigger />
      <TimeRangeContent>
        <TimeRangePresets />
        <TimeRangeExpression />
      </TimeRangeContent>
    </TimeRange>
  );
}

describe("TimeRange", () => {
  it("names the trigger by the range it holds", () => {
    render(<Picker defaultValue="now-6h..now" />);
    expect(screen.getByRole("button", { name: /Last 6 hours/ })).toBeInTheDocument();
  });

  it("reads the resolved window after the label, not instead of it", () => {
    render(<Picker defaultValue="now-6h..now" />);

    const trigger = screen.getByRole("button", { name: /Last 6 hours/ });
    expect(trigger).toHaveAccessibleName(/Last 6 hours.*Jun 17, 2026/s);
  });

  describe("without a now prop", () => {
    // The clock has to come from somewhere, and reading it during render is
    // exactly what the prop exists to prevent: the server renders one instant
    // and hydration reads another, and React throws the tree away.
    it("renders no clock-dependent text on the server", () => {
      const markup = renderToStaticMarkup(
        <TimeRange defaultValue="now-6h..now">
          <TimeRangeTrigger />
          <TimeRangeContent>
            <TimeRangePresets />
          </TimeRangeContent>
        </TimeRange>,
      );

      expect(markup).toContain("Last 6 hours");
      expect(markup).not.toMatch(/\d{4}/);
    });

    it("still names the range, because the label does not need a clock", () => {
      render(
        <TimeRange defaultValue="now-24h..now">
          <TimeRangeTrigger />
          <TimeRangeContent>
            <TimeRangePresets />
          </TimeRangeContent>
        </TimeRange>,
      );

      expect(screen.getByRole("button", { name: /Last 24 hours/ })).toBeInTheDocument();
    });

    it("picks the clock up after mount", async () => {
      render(
        <TimeRange defaultValue="now-6h..now" locale="en-US">
          <TimeRangeTrigger showResolved />
          <TimeRangeContent>
            <TimeRangePresets />
          </TimeRangeContent>
        </TimeRange>,
      );

      expect(await screen.findByText(/\d{4}/)).toBeInTheDocument();
    });
  });

  it("marks the trigger invalid when the expression does not resolve", () => {
    render(<Picker defaultValue="nonsense" />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-invalid", "true");
  });

  it("throws a useful error when a part is used outside the root", () => {
    // Rendering an orphan part otherwise fails somewhere unrelated.
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<TimeRangeTrigger />)).toThrow(/must be used inside <TimeRange>/);
    quiet.mockRestore();
  });

  describe("presets", () => {
    it("reports the chosen expression, not resolved timestamps", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Picker onValueChange={onValueChange} />);

      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));
      await user.click(screen.getByRole("button", { name: "Last 24 hours" }));

      expect(onValueChange).toHaveBeenCalledWith("now-24h..now");
    });

    it("marks the one that matches the current expression", async () => {
      const user = userEvent.setup();
      render(<Picker defaultValue="now-1h..now" />);

      await user.click(screen.getByRole("button", { name: /Last hour/ }));

      expect(screen.getByRole("button", { name: "Last hour" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: "Last 6 hours" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    it("closes once a choice is made", async () => {
      const user = userEvent.setup();
      render(<Picker />);

      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));
      await user.click(screen.getByRole("button", { name: "Today" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("groups relative and calendar ranges", async () => {
      const user = userEvent.setup();
      render(<Picker />);
      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));

      const calendar = screen.getByRole("group", { name: "Calendar" });
      expect(within(calendar).getByRole("button", { name: "Yesterday" })).toBeInTheDocument();
    });

    it("takes a caller's own presets", async () => {
      const user = userEvent.setup();
      render(
        <Picker
          presets={[{ expression: "now-3h..now", label: "Since the deploy", group: "Ours" }]}
        />,
      );
      await user.click(screen.getByRole("button"));

      expect(screen.getByRole("button", { name: "Since the deploy" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Last 24 hours" })).not.toBeInTheDocument();
    });
  });

  describe("expression entry", () => {
    it("previews the window the draft resolves to", async () => {
      const user = userEvent.setup();
      render(<Picker />);
      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));

      const field = screen.getByLabelText("Expression");
      await user.clear(field);
      await user.type(field, "now-90m..now");

      expect(field).toHaveAccessibleDescription(/Jun 17, 2026/);
    });

    it("says why an entry is invalid", async () => {
      const user = userEvent.setup();
      render(<Picker />);
      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));

      const field = screen.getByLabelText("Expression");
      await user.clear(field);
      await user.type(field, "now-6q..now");

      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(field).toHaveAccessibleDescription(/offset like -6h/);
    });

    it("does not apply an invalid entry", async () => {
      // A chart quietly re-scoping itself to a window nobody asked for is
      // worse than one that refuses.
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Picker onValueChange={onValueChange} />);
      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));

      const field = screen.getByLabelText("Expression");
      await user.clear(field);
      await user.type(field, "now-6q..now{Enter}");

      expect(onValueChange).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    });

    it("applies on Enter", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Picker onValueChange={onValueChange} />);
      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));

      const field = screen.getByLabelText("Expression");
      await user.clear(field);
      await user.type(field, "now-90m..now{Enter}");

      expect(onValueChange).toHaveBeenCalledWith("now-90m..now");
    });

    it("applies on the button", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Picker onValueChange={onValueChange} />);
      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));

      const field = screen.getByLabelText("Expression");
      await user.clear(field);
      await user.type(field, "now-2d..now");
      await user.click(screen.getByRole("button", { name: "Apply" }));

      expect(onValueChange).toHaveBeenCalledWith("now-2d..now");
    });

    it("trims what it applies", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Picker onValueChange={onValueChange} />);
      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));

      const field = screen.getByLabelText("Expression");
      await user.clear(field);
      await user.type(field, "  now-2d..now  {Enter}");

      expect(onValueChange).toHaveBeenCalledWith("now-2d..now");
    });

    it("follows the value when a preset changes it underneath", async () => {
      const user = userEvent.setup();
      render(<Picker />);

      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));
      await user.click(screen.getByRole("button", { name: "Last 24 hours" }));
      await user.click(screen.getByRole("button", { name: /Last 24 hours/ }));

      expect(screen.getByLabelText("Expression")).toHaveValue("now-24h..now");
    });

    it("keeps one description so the error replaces the preview", async () => {
      const user = userEvent.setup();
      render(<Picker />);
      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));

      const field = screen.getByLabelText("Expression");
      await user.clear(field);
      await user.type(field, "now-6q..now");

      expect(field).toHaveAccessibleDescription(/offset like -6h/);
      expect(field).not.toHaveAccessibleDescription(/Jun 17/);
    });
  });

  describe("controlled", () => {
    it("does not move on its own", async () => {
      const user = userEvent.setup();
      render(<Picker value="now-6h..now" onValueChange={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));
      await user.click(screen.getByRole("button", { name: "Last 24 hours" }));

      expect(screen.getByRole("button", { name: /Last 6 hours/ })).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("names the dialog", async () => {
      const user = userEvent.setup();
      render(<Picker />);
      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));

      expect(screen.getByRole("dialog", { name: "Choose a time range" })).toBeInTheDocument();
    });

    it("has no violations when closed", async () => {
      const { container } = render(<Picker />);
      await expectNoA11yViolations(container);
    });

    it("has no violations when open", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(<Picker />);
      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));

      await expectNoA11yViolations(baseElement);
    });

    it("has no violations with the calendar", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(
        <TimeRange now={NOW} timeZone="UTC" locale="en-US">
          <TimeRangeTrigger />
          <TimeRangeContent>
            <TimeRangePresets />
            <TimeRangeCalendar />
          </TimeRangeContent>
        </TimeRange>,
      );
      await user.click(screen.getByRole("button", { name: /Last 6 hours/ }));

      await expectNoA11yViolations(baseElement);
    });
  });

  it("can show the resolved window on the trigger", () => {
    render(
      <TimeRange now={NOW} timeZone="UTC" locale="en-US" defaultValue="now-6h..now">
        <TimeRangeTrigger showResolved />
        <TimeRangeContent>
          <TimeRangePresets />
        </TimeRangeContent>
      </TimeRange>,
    );

    expect(screen.getByText(/Jun 17, 2026/)).toBeInTheDocument();
  });
});
