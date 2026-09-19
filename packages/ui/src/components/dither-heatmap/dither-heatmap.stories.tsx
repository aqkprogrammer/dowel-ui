import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DitherHeatmap } from "./dither-heatmap";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** amicro's contribution pattern: five levels, ten contributions a level. */
function contributions(weeks: number) {
  const columns = Array.from({ length: weeks }, (_, w) => `W${String(w + 1)}`);
  const values = WEEKDAYS.map((_, d) =>
    columns.map((_, w) => {
      const level = Math.floor(Math.sin(w * 0.5 + d * 0.2) * 2 + Math.cos(w * 1.2) * 1.5 + 2);
      return Math.max(0, Math.min(4, level)) * 10;
    }),
  );
  return { columns, values };
}

const HOURS = Array.from({ length: 12 }, (_, h) => `${String(h * 2)}:00`);
/** amicro's day × hour load, with its Math.random term made deterministic. */
const OPS = WEEKDAYS.map((_, d) =>
  HOURS.map((_, h) =>
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          20 + Math.sin(d * 1.5 + h * 0.8) * 35 + 20 + Math.sin(d * 7.3 + h * 3.1) * 20,
        ),
      ),
    ),
  ),
);

const initial = contributions(12);

const meta = {
  title: "Data/Dither Heatmap",
  component: DitherHeatmap,
  args: {
    rows: WEEKDAYS,
    columns: initial.columns,
    values: initial.values,
    label: "Contributions by week",
    levels: 5,
    max: 40,
    showLegend: true,
    size: "md",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    rows: { control: false },
    columns: { control: false },
    values: { control: false },
  },
} satisfies Meta<typeof DitherHeatmap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const PERIODS = [
  { name: "Last 3 Months", weeks: 12 },
  { name: "Last 6 Months", weeks: 24 },
];

/** amicro's Activity Dither Heatmap: weeks × weekdays, five levels, by period. */
function ActivityHeatmap() {
  const [period, setPeriod] = useState(0);
  const { columns, values } = contributions(PERIODS[period]?.weeks ?? 12);
  const total = values.flat().reduce((a, b) => a + b, 0);
  return (
    <div className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          <span className="tabular-nums">{new Intl.NumberFormat().format(total)}</span>{" "}
          contributions
        </p>
        <div
          role="group"
          aria-label="Period"
          className="inline-flex rounded-full border border-border bg-muted p-0.5 text-xs"
        >
          {PERIODS.map((p, index) => (
            <button
              key={p.name}
              type="button"
              aria-pressed={period === index}
              onClick={() => {
                setPeriod(index);
              }}
              className="rounded-full px-2.5 py-1 font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:outline-none aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <DitherHeatmap
        rows={WEEKDAYS}
        columns={columns}
        values={values}
        levels={5}
        max={40}
        showLegend
        rowLabel="Day"
        label={`Contributions, ${PERIODS[period]?.name ?? ""}`}
        formatCell={({ row, column, value }) =>
          `${column} ${row}: ${String(value)} contributions`
        }
      />
    </div>
  );
}

/** amicro's Dither Heatmap Grid: day × two-hour load with a hover tooltip. */
function LoadGrid() {
  return (
    <div className="flex max-w-2xl flex-col gap-3 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Dither Heatmap Grid
      </p>
      <DitherHeatmap
        rows={WEEKDAYS}
        columns={HOURS}
        values={OPS}
        max={100}
        size="lg"
        rowLabel="Day"
        label="Operations per second by day and hour"
        formatCell={({ row, column, value }) => `${row} @ ${column} - ${String(value)} ops/s`}
      />
    </div>
  );
}

export const ActivityDitherHeatmap: Story = {
  parameters: { controls: { disable: true } },
  render: () => <ActivityHeatmap />,
};

/** Every amicro source item this component covers. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-8">
      <figure className="flex flex-col gap-2">
        <ActivityHeatmap />
        <figcaption className="text-xs text-muted-foreground">
          Activity Dither Heatmap
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <LoadGrid />
        <figcaption className="text-xs text-muted-foreground">
          Dither Heatmap Grid (the day × hour grid with tooltip)
        </figcaption>
      </figure>
    </div>
  ),
};

export const Continuous: Story = {
  args: { levels: undefined, max: undefined, showLegend: false, color: "info" },
};

export const WithVisibleTable: Story = {
  args: { showTable: true },
};

export const Static: Story = {
  args: { animate: false },
};
