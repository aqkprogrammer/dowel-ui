import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";

import { AnalyticsBlock, type AnalyticsBreakdownRow, type AnalyticsPoint } from "./analytics";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[62rem] max-w-full">
    <Story />
  </div>
);

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SERIES: AnalyticsPoint[] = [1240, 1810, 1520, 2140, 2380, 1180, 940].map(
  (value, index) => ({
    at: `2026-03-0${String(index + 1)}`,
    label: DAYS[index] ?? "",
    value,
  }),
);

const BREAKDOWN: AnalyticsBreakdownRow[] = [
  { id: "search", label: "Organic search", value: 5820 },
  { id: "direct", label: "Direct", value: 2940 },
  { id: "referral", label: "Referral", value: 1610 },
  { id: "social", label: "Social", value: 840 },
];

const RANGES = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

const percent = (value: number) => `${String(value)}%`;

const meta = {
  title: "Blocks/Analytics",
  component: AnalyticsBlock,
  parameters: { controls: { disable: true }, layout: "padded" },
  decorators: [withPageWidth],
  args: { metrics: [] },
} satisfies Meta<typeof AnalyticsBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

const METRICS = [
  {
    id: "visitors",
    label: "Visitors",
    value: 11_210,
    previous: 9_840,
    comparisonLabel: "vs last week",
  },
  {
    id: "signups",
    label: "Signups",
    value: 284,
    previous: 231,
    comparisonLabel: "vs last week",
  },
  {
    id: "bounce",
    label: "Bounce rate",
    value: 38,
    previous: 44,
    polarity: "lower-is-better" as const,
    format: percent,
    comparisonLabel: "vs last week",
  },
  {
    id: "latency",
    label: "p95 latency",
    value: 214,
    previous: 208,
    polarity: "lower-is-better" as const,
    format: (value: number) => `${String(value)} ms`,
    comparisonLabel: "vs last week",
  },
];

export const Default: Story = {
  args: {
    metrics: METRICS,
    series: SERIES,
    breakdown: BREAKDOWN,
    ranges: RANGES,
    range: "7d",
  },
};

/** The range actually changing what is shown. */
export const Interactive: Story = {
  render: () => {
    const [range, setRange] = useState("7d");
    const scale = range === "7d" ? 1 : range === "30d" ? 4.2 : 11.6;

    return (
      <AnalyticsBlock
        metrics={METRICS.map((metric) =>
          metric.id === "visitors"
            ? { ...metric, value: Math.round(metric.value * scale) }
            : metric,
        )}
        series={SERIES.map((point) => ({
          ...point,
          value: Math.round(point.value * scale),
        }))}
        breakdown={BREAKDOWN}
        ranges={RANGES}
        range={range}
        onRangeChange={setRange}
      />
    );
  },
};

export const NoSeriesYet: Story = {
  args: {
    metrics: METRICS.slice(0, 2),
    description: "Not enough history to plot yet.",
  },
};

export const WithActions: Story = {
  args: {
    ...Default.args,
    actions: (
      <Button variant="outline" size="sm">
        Export CSV
      </Button>
    ),
  },
};
