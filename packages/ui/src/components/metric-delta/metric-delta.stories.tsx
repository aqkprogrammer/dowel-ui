import type { Meta, StoryObj } from "@storybook/react-vite";

import { MetricDelta } from "./metric-delta";

const currency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const meta = {
  title: "Data/Metric Delta",
  component: MetricDelta,
  args: {
    label: "Monthly revenue",
    value: 48_200,
    previous: 44_100,
    format: currency,
    comparisonLabel: "vs last month",
  },
  argTypes: {
    polarity: {
      control: "inline-radio",
      options: ["higher-is-better", "lower-is-better", "neutral"],
    },
  },
} satisfies Meta<typeof MetricDelta>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The whole point. Churn rising is not good news, and a component that paints
 * every increase green is actively misleading — which is what most dashboards
 * ship.
 */
export const PolarityMatters: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 sm:grid-cols-2">
      <MetricDelta
        label="Active users"
        value={12_400}
        previous={11_200}
        polarity="higher-is-better"
        comparisonLabel="vs last week"
      />
      <MetricDelta
        label="Monthly churn"
        value={4.1}
        previous={3.2}
        polarity="lower-is-better"
        format={(v) => `${v.toFixed(1)}%`}
        comparisonLabel="vs last month"
      />
    </div>
  ),
};

/**
 * There is no percentage change from nothing. Most implementations render
 * `+∞%` or `NaN%` here; this states the absolute change and says why there is
 * no percentage.
 */
export const ZeroBaseline: Story = {
  args: { label: "Enterprise signups", value: 25, previous: 0, format: undefined },
};

/**
 * A 1% move on a small sample is noise. The threshold drops the sentiment
 * colour and says so — it is a presentation rule, not a significance test, and
 * the component is careful not to claim otherwise.
 */
export const BelowTheNoiseFloor: Story = {
  args: {
    label: "Conversion rate",
    value: 3.42,
    previous: 3.39,
    insignificantBelow: 0.05,
    sampleSize: 412,
    format: (v: number) => `${v.toFixed(2)}%`,
  },
};

/** With no prior period there is nothing to compare, so nothing is claimed. */
export const NoComparison: Story = {
  args: { label: "Total workspaces", value: 1_284, previous: undefined, format: undefined },
};

/** An unchanged value is its own state, not a rise of zero. */
export const Unchanged: Story = {
  args: { label: "Seats in use", value: 25, previous: 25, format: undefined },
};

/** The row a SaaS dashboard opens with. */
export const DashboardRow: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <MetricDelta label="MRR" value={48_200} previous={44_100} format={currency} />
      <MetricDelta
        label="Active users"
        value={12_400}
        previous={11_910}
        comparisonLabel="vs last week"
      />
      <MetricDelta
        label="Churn"
        value={4.1}
        previous={3.2}
        polarity="lower-is-better"
        format={(v) => `${v.toFixed(1)}%`}
      />
      <MetricDelta
        label="p95 latency"
        value={412}
        previous={520}
        polarity="lower-is-better"
        format={(v) => `${String(v)} ms`}
      />
    </div>
  ),
};

/** Eval scores and cost per run, where polarity is the whole story. */
export const AiEvaluation: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 sm:grid-cols-3">
      <MetricDelta
        label="Faithfulness"
        value={0.92}
        previous={0.88}
        format={(v) => v.toFixed(2)}
        comparisonLabel="vs previous model"
      />
      <MetricDelta
        label="Cost per run"
        value={0.0142}
        previous={0.0098}
        polarity="lower-is-better"
        format={(v) => `$${v.toFixed(4)}`}
        comparisonLabel="vs previous model"
      />
      <MetricDelta
        label="Refusal rate"
        value={1.2}
        previous={1.19}
        polarity="lower-is-better"
        insignificantBelow={0.05}
        sampleSize={2_400}
        format={(v) => `${v.toFixed(2)}%`}
      />
    </div>
  ),
};
