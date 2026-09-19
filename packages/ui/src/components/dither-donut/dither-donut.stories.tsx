import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DitherDonut, type DitherDonutDatum } from "./dither-donut";

const PLANS: DitherDonutDatum[] = [
  { label: "Unlimited", value: 1240 },
  { label: "30-day pass", value: 980 },
  { label: "10-class pack", value: 620 },
  { label: "Drop-in", value: 410 },
  { label: "Student", value: 300 },
];

const meta = {
  title: "Data/Dither Donut",
  component: DitherDonut,
  args: { data: PLANS, label: "Plan distribution", variant: "graph", size: "md" },
  argTypes: {
    variant: { control: "inline-radio", options: ["graph", "flat"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    data: { control: false },
  },
} satisfies Meta<typeof DitherDonut>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A segmented control for the demos. Consumer UI, not part of the chart. */
function PeriodPicker({
  periods,
  value,
  onChange,
}: {
  periods: string[];
  value: number;
  onChange: (index: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Period"
      className="inline-flex rounded-full border border-border bg-muted p-0.5 text-xs"
    >
      {periods.map((period, index) => (
        <button
          key={period}
          type="button"
          aria-pressed={value === index}
          onClick={() => {
            onChange(index);
          }}
          className="rounded-full px-2.5 py-1 font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:outline-none aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        >
          {period}
        </button>
      ))}
    </div>
  );
}

const PERIODS = [
  { name: "Week", mult: 0.42 },
  { name: "Month", mult: 1 },
  { name: "Quarter", mult: 2.6 },
  { name: "Year", mult: 8.4 },
];

/** amicro's Dither Donut Graph: plan shares by period, morphing between them. */
function PlanDistribution() {
  const [period, setPeriod] = useState(1);
  const mult = PERIODS[period]?.mult ?? 1;
  const data = PLANS.map((plan, i) => ({
    ...plan,
    value: Math.round(
      plan.value * mult * (0.78 + 0.4 * (0.5 + 0.5 * Math.sin(i * 1.9 + period * 1.3))),
    ),
  }));
  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Plan distribution</h3>
          <p className="text-xs text-muted-foreground">Members by plan</p>
        </div>
        <PeriodPicker
          periods={PERIODS.map((p) => p.name)}
          value={period}
          onChange={setPeriod}
        />
      </div>
      <DitherDonut data={data} label={`Plan distribution, ${PERIODS[period]?.name ?? ""}`} />
    </div>
  );
}

export const DitherDonutGraph: Story = {
  parameters: { controls: { disable: true } },
  render: () => <PlanDistribution />,
};

const DEVICES = [
  { name: "Today", data: [65, 25, 10] },
  { name: "Last 7D", data: [55, 35, 10] },
];

/** amicro's Device Usage Donut: flat sectors, even drifting cells, compact. */
function DeviceUsage() {
  const [period, setPeriod] = useState(0);
  const values = DEVICES[period]?.data ?? [];
  return (
    <div className="flex w-fit flex-col items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <PeriodPicker periods={DEVICES.map((d) => d.name)} value={period} onChange={setPeriod} />
      <DitherDonut
        variant="flat"
        size="sm"
        thickness={0.35}
        label="Device usage"
        formatValue={(value) => `${String(value)}%`}
        data={["Mobile", "Desktop", "Tablet"].map((label, i) => ({
          label,
          value: values[i] ?? 0,
        }))}
      />
    </div>
  );
}

export const DeviceUsageDonut: Story = {
  parameters: { controls: { disable: true } },
  render: () => <DeviceUsage />,
};

/** Every amicro source item this component covers. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <figure className="flex flex-col gap-2">
        <PlanDistribution />
        <figcaption className="text-xs text-muted-foreground">
          Dither Donut Graph — variant="graph"
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <DeviceUsage />
        <figcaption className="text-xs text-muted-foreground">
          Device Usage Donut — variant="flat" size="sm"
        </figcaption>
      </figure>
    </div>
  ),
};

/** Series colours are tokens; pass any token name or colour-mix expression. */
export const TokenColours: Story = {
  args: {
    label: "Tickets by status",
    data: [
      { label: "Open", value: 42, color: "primary" },
      { label: "Waiting", value: 18, color: "info" },
      { label: "Closed", value: 77, color: "muted-foreground" },
    ],
  },
};

export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [active, setActive] = useState<number | null>(0);
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Pinned: {active === null ? "none" : PLANS[active]?.label}
        </p>
        <DitherDonut
          data={PLANS}
          label="Plan distribution"
          activeIndex={active}
          onActiveIndexChange={setActive}
        />
      </div>
    );
  },
};

export const WithVisibleTable: Story = {
  args: { showTable: true },
};

/** The static frame drawn under reduced motion, forced on here. */
export const Static: Story = {
  args: { animate: false },
};
