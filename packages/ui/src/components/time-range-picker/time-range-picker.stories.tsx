import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { formatResolvedRange, resolveTimeRange } from "./time-expression";
import {
  TimeRange,
  TimeRangeCalendar,
  TimeRangeContent,
  TimeRangeExpression,
  TimeRangePresets,
  TimeRangeTrigger,
} from "./time-range-picker";

/** Named so its type is nameable in declaration output (TS2883). */
const withRoom: Decorator = (Story) => (
  <div className="flex min-h-96 w-full max-w-3xl flex-col items-start gap-4">
    <Story />
  </div>
);

const meta = {
  title: "Form/Time Range Picker",
  component: TimeRange,
  decorators: [withRoom],
  parameters: { controls: { disable: true } },
  args: { children: null },
} satisfies Meta<typeof TimeRange>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Presets, an expression field and a calendar — the whole control. */
export const Default: Story = {
  render: function Default() {
    const [value, setValue] = useState("now-6h..now");

    return (
      <>
        <TimeRange value={value} onValueChange={setValue}>
          <TimeRangeTrigger />
          <TimeRangeContent>
            <TimeRangePresets />
            <TimeRangeExpression />
          </TimeRangeContent>
        </TimeRange>
        <p className="font-mono text-xs text-muted-foreground">value = {value}</p>
      </>
    );
  },
};

/**
 * Why the value is an expression.
 *
 * `now` advances every second. A relative range follows it; the frozen pair
 * beside it is the same window it was when the page loaded, which is what
 * storing two timestamps gets you after a refresh.
 */
export const StaysRelative: Story = {
  render: function StaysRelative() {
    const [now, setNow] = useState(() => new Date());
    const [frozen] = useState(() => resolveTimeRange("now-1m..now", { now: new Date() }));

    useEffect(() => {
      const timer = setInterval(() => {
        setNow(new Date());
      }, 1000);
      return () => {
        clearInterval(timer);
      };
    }, []);

    const live = resolveTimeRange("now-1m..now", { now });

    return (
      <>
        <TimeRange defaultValue="now-1m..now" now={now}>
          <TimeRangeTrigger showResolved />
          <TimeRangeContent>
            <TimeRangePresets />
            <TimeRangeExpression />
          </TimeRangeContent>
        </TimeRange>
        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 font-mono text-xs">
          <dt className="text-muted-foreground">expression</dt>
          <dd>{formatResolvedRange(live)}</dd>
          <dt className="text-muted-foreground">frozen pair</dt>
          <dd className="text-muted-foreground">{formatResolvedRange(frozen)}</dd>
        </dl>
      </>
    );
  },
};

/**
 * Snapping. `now-6h/h` starts on the hour, so the window does not slide by a
 * second between refreshes and the buckets in a chart line up.
 *
 * `now/d..now/d` is the case worth reading the source for: the opening side
 * floors to midnight and the closing side climbs to the last millisecond of the
 * same day. Flooring both would be a range of zero length.
 */
export const Snapping: Story = {
  render: function Snapping() {
    const [now] = useState(() => new Date());
    const rows = ["now-6h..now", "now-6h/h..now", "now/d..now/d", "now-1w/w..now-1w/w"];

    return (
      <>
        <TimeRange defaultValue="now-6h/h..now" now={now}>
          <TimeRangeTrigger />
          <TimeRangeContent>
            <TimeRangePresets />
            <TimeRangeExpression />
          </TimeRangeContent>
        </TimeRange>
        <dl className="grid grid-cols-[13rem_1fr] gap-x-3 gap-y-1 font-mono text-xs">
          {rows.map((expression) => (
            <div key={expression} className="contents">
              <dt className="text-muted-foreground">{expression}</dt>
              <dd>{formatResolvedRange(resolveTimeRange(expression, { now }))}</dd>
            </div>
          ))}
        </dl>
      </>
    );
  },
};

/**
 * With the calendar, for a window that has no relative meaning. Picking dates
 * writes a concrete expression — the honest translation, since "1 to 7 March"
 * does not become relative just because it was chosen here.
 */
export const WithCalendar: Story = {
  render: function WithCalendar() {
    const [value, setValue] = useState("now-7d..now");

    return (
      <>
        <TimeRange value={value} onValueChange={setValue}>
          <TimeRangeTrigger />
          <TimeRangeContent>
            <TimeRangePresets />
            <TimeRangeCalendar />
          </TimeRangeContent>
        </TimeRange>
        <p className="font-mono text-xs break-all text-muted-foreground">value = {value}</p>
      </>
    );
  },
};

/**
 * Type `now-90m..now` — no preset list covers everything, and the expression
 * field is what stops the presets being a ceiling. Type `now-6q..now` and it
 * says why it will not apply rather than quietly re-scoping the chart.
 */
export const ExpressionEntry: Story = {
  render: function ExpressionEntry() {
    const [value, setValue] = useState("now-90m..now");

    return (
      <>
        <TimeRange value={value} onValueChange={setValue} open>
          <TimeRangeTrigger />
          <TimeRangeContent>
            <TimeRangeExpression />
          </TimeRangeContent>
        </TimeRange>
        <p className="font-mono text-xs text-muted-foreground">value = {value}</p>
      </>
    );
  },
};

/**
 * A zone the app already knows. There is no timezone picker here on purpose —
 * that is a 400-entry combobox and a decision an app makes once, so it is a prop.
 */
export const InAnotherZone: Story = {
  render: function InAnotherZone() {
    const [now] = useState(() => new Date());
    const zones = ["UTC", "America/Denver", "Asia/Kolkata", "Pacific/Auckland"];

    return (
      <div className="flex flex-col gap-3">
        {zones.map((timeZone) => (
          <div key={timeZone} className="flex items-center gap-3">
            <span className="w-40 font-mono text-xs text-muted-foreground">{timeZone}</span>
            <TimeRange defaultValue="now/d..now/d" now={now} timeZone={timeZone}>
              <TimeRangeTrigger showResolved />
              <TimeRangeContent>
                <TimeRangePresets />
                <TimeRangeExpression />
              </TimeRangeContent>
            </TimeRange>
          </div>
        ))}
      </div>
    );
  },
};

/** Your own named ranges, replacing the shipped ones. */
export const CustomPresets: Story = {
  render: function CustomPresets() {
    const [value, setValue] = useState("now-15m..now");

    return (
      <>
        <TimeRange
          value={value}
          onValueChange={setValue}
          presets={[
            { expression: "now-15m..now", label: "Since the deploy", group: "Incident" },
            { expression: "now-1h..now", label: "The last hour", group: "Incident" },
            { expression: "now-1d/d..now-1d/d", label: "Yesterday", group: "Reporting" },
            { expression: "now-1M/M..now-1M/M", label: "Last month", group: "Reporting" },
          ]}
        >
          <TimeRangeTrigger />
          <TimeRangeContent>
            <TimeRangePresets />
            <TimeRangeExpression />
          </TimeRangeContent>
        </TimeRange>
        <p className="font-mono text-xs text-muted-foreground">value = {value}</p>
      </>
    );
  },
};

/** An expression that does not resolve. The trigger says so instead of guessing. */
export const InvalidValue: Story = {
  render: function InvalidValue() {
    return (
      <TimeRange defaultValue="now-6q..now">
        <TimeRangeTrigger />
        <TimeRangeContent>
          <TimeRangePresets />
          <TimeRangeExpression />
        </TimeRangeContent>
      </TimeRange>
    );
  },
};
