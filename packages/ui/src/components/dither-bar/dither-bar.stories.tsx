import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DitherBar, type DitherBarDatum, type DitherBarSeries } from "./dither-bar";

const SERIES: DitherBarSeries[] = [
  { key: "cash", label: "Cash" },
  { key: "qr", label: "QR" },
  { key: "bank", label: "Bank" },
];
const SHARES = [0.46, 0.31, 0.23];
const BRANCHES = ["Bishkek", "Osh", "Jalal-Abad", "Karakol"];
const WEIGHTS = [0.45, 0.25, 0.18, 0.12];

function branches(mult: number): DitherBarDatum[] {
  return BRANCHES.map((label, b) => ({
    label,
    values: Object.fromEntries(
      SERIES.map((entry, s) => [
        entry.key,
        Math.round(
          150_000 *
            WEIGHTS[b]! *
            mult *
            SHARES[s]! *
            (0.9 + 0.14 * Math.sin(b * 3.1 + s * 1.7)),
        ),
      ]),
    ),
  }));
}

const money = (value: number) => `$${new Intl.NumberFormat().format(value)}`;

const meta = {
  title: "Data/Dither Bar",
  component: DitherBar,
  args: {
    series: SERIES,
    data: branches(4),
    label: "Revenue by branch",
    formatValue: money,
    size: "md",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    series: { control: false },
    data: { control: false },
    formatValue: { control: false },
  },
} satisfies Meta<typeof DitherBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const PERIODS = [
  { name: "Week", mult: 1 },
  { name: "Month", mult: 4 },
  { name: "Quarter", mult: 13 },
  { name: "Year", mult: 52 },
];

/** amicro's Dither Stacked Bar: payment channels per branch, by period. */
function StackedRevenue() {
  const [period, setPeriod] = useState(1);
  const data = branches(PERIODS[period]?.mult ?? 1);
  const total = data.reduce(
    (sum, datum) => sum + Object.values(datum.values).reduce((a, b) => a + b, 0),
    0,
  );
  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums">{money(total)}</p>
          <p className="text-xs text-muted-foreground">
            Stacked payment channels per regional branch
          </p>
        </div>
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
      <DitherBar
        series={SERIES}
        data={data}
        label={`Revenue by branch, ${PERIODS[period]?.name ?? ""}`}
        formatValue={money}
      />
    </div>
  );
}

export const DitherStackedBar: Story = {
  parameters: { controls: { disable: true } },
  render: () => <StackedRevenue />,
};

/** Every amicro source item this component covers. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col gap-2">
      <StackedRevenue />
      <figcaption className="text-xs text-muted-foreground">Dither Stacked Bar</figcaption>
    </figure>
  ),
};

export const PinnedSeries: Story = {
  args: { defaultActiveSeries: "qr" },
};

export const WithVisibleTable: Story = {
  args: { showTable: true },
};

export const Static: Story = {
  args: { animate: false },
};
