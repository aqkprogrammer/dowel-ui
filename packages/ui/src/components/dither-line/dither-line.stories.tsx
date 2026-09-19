import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DitherLine } from "./dither-line";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKS = [
  { name: "This week", data: [1200, 1500, 1100, 1800, 2200, 2900, 1750] },
  { name: "Last week", data: [900, 1100, 800, 1300, 1600, 2100, 2000] },
];
const money = (value: number) => `$${new Intl.NumberFormat().format(value)}`;
const week = (values: number[]) => DAYS.map((label, i) => ({ label, value: values[i] ?? 0 }));

const meta = {
  title: "Data/Dither Line",
  component: DitherLine,
  args: {
    data: week(WEEKS[0]?.data ?? []),
    label: "Revenue this week",
    formatValue: money,
    size: "md",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    data: { control: false },
    formatValue: { control: false },
  },
} satisfies Meta<typeof DitherLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** amicro's Revenue Spline Line: this week against last, morphing between them. */
function WeeklyRevenue() {
  const [index, setIndex] = useState(0);
  const current = WEEKS[index] ?? WEEKS[0];
  const total = (current?.data ?? []).reduce((sum, value) => sum + value, 0);
  return (
    <div className="flex max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="text-xl font-semibold tabular-nums">{money(total)}</p>
        </div>
        <div
          role="group"
          aria-label="Week"
          className="inline-flex rounded-full border border-border bg-muted p-0.5 text-xs"
        >
          {WEEKS.map((w, i) => (
            <button
              key={w.name}
              type="button"
              aria-pressed={index === i}
              onClick={() => {
                setIndex(i);
              }}
              className="rounded-full px-2.5 py-1 font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:outline-none aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {w.name}
            </button>
          ))}
        </div>
      </div>
      <DitherLine
        data={week(current?.data ?? [])}
        label={`Revenue, ${current?.name ?? ""}`}
        formatValue={money}
        size="sm"
      />
    </div>
  );
}

export const RevenueSplineLine: Story = {
  parameters: { controls: { disable: true } },
  render: () => <WeeklyRevenue />,
};

/** Every amicro source item this component covers. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col gap-2">
      <WeeklyRevenue />
      <figcaption className="text-xs text-muted-foreground">Revenue Spline Line</figcaption>
    </figure>
  ),
};

export const WithVisibleTable: Story = {
  args: { showTable: true },
};

export const Static: Story = {
  args: { animate: false },
};
