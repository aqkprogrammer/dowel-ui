import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DitherBar, type DitherBarDatum, type DitherBarSeries } from "@/components/dither-bar";
import { DitherLine } from "@/components/dither-line";

import { ChartSonifier, type ChartSonifierSeries } from "./chart-sonifier";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-xl">
    <Story />
  </div>
);

/* Deployments per day, 5–18 October 2026. ---------------------------------- */

const DATES = Array.from({ length: 14 }, (_, i) => `2026-10-${String(5 + i).padStart(2, "0")}`);
const DEPLOYS = [18, 24, 31, 42, 27, 9, 6, 22, 29, 35, 38, 33, 12, 8];
const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const formatDate = (date: string) => dayFormat.format(new Date(`${date}T00:00:00Z`));
const DEPLOY_SERIES: ChartSonifierSeries[] = [
  { key: "deployments", label: "Deployments", values: DEPLOYS },
];
const UNIT = { one: "deployment", other: "deployments" };

const meta = {
  title: "Data/Chart Sonifier",
  component: ChartSonifier,
  decorators: [withWidth],
  args: {
    series: DEPLOY_SERIES,
    categories: DATES,
    formatCategory: formatDate,
    unit: UNIT,
    label: "Deployments per day",
    size: "md",
    variant: "outline",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md"] },
    variant: { control: "inline-radio", options: ["outline", "plain"] },
    series: { control: false },
    categories: { control: false },
    formatValue: { control: false },
    formatCategory: { control: false },
  },
} satisfies Meta<typeof ChartSonifier>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Beside the line it sonifies, sharing one cursor: scrubbing or playing the
 * sound moves the chart's cursor to the point being heard, and scrubbing the
 * chart moves the sound's slider.
 */
function DeploymentsWithLine() {
  const [index, setIndex] = useState(0);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <DitherLine
        data={DATES.map((date, i) => ({ label: formatDate(date), value: DEPLOYS[i] ?? 0 }))}
        label="Deployments per day"
        size="sm"
        index={index}
        onIndexChange={(next) => {
          if (next !== null) setIndex(next);
        }}
      />
      <ChartSonifier
        variant="plain"
        series={DEPLOY_SERIES}
        categories={DATES}
        formatCategory={formatDate}
        unit={UNIT}
        label="Deployments per day"
        index={index}
        onIndexChange={setIndex}
      />
    </div>
  );
}

export const Default: Story = {
  parameters: { controls: { disable: true } },
  render: () => <DeploymentsWithLine />,
};

/* Revenue by payment channel, six months: DitherBar's shape. -------------- */

const CHANNELS: DitherBarSeries[] = [
  { key: "cash", label: "Cash" },
  { key: "qr", label: "QR" },
  { key: "bank", label: "Bank" },
];
const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const BY_MONTH: DitherBarDatum[] = MONTHS.map((label, m) => ({
  label,
  values: {
    cash: Math.round(42_000 - m * 3_100 + 2_000 * Math.sin(m * 1.7)),
    qr: Math.round(18_000 + m * 4_200 + 1_500 * Math.sin(m * 2.3)),
    bank: Math.round(21_000 + 900 * Math.sin(m * 1.1)),
  },
}));
const money = (value: number) => `$${new Intl.NumberFormat("en-US").format(value)}`;

/** The same data, one series per channel, points in the bars' order. */
const CHANNEL_SERIES: ChartSonifierSeries[] = CHANNELS.map((channel) => ({
  key: channel.key,
  label: channel.label,
  values: BY_MONTH.map((datum) => datum.values[channel.key] ?? null),
}));

/**
 * Several series, heard one at a time. The chosen series is pinned on the
 * chart too, so what is lit is what is playing.
 */
function RevenueWithBars() {
  const [channel, setChannel] = useState(CHANNELS[0]?.key ?? "cash");
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <DitherBar
        series={CHANNELS}
        data={BY_MONTH}
        label="Revenue by channel"
        formatValue={money}
        size="sm"
        activeSeries={channel}
      />
      <ChartSonifier
        variant="plain"
        series={CHANNEL_SERIES}
        categories={MONTHS}
        formatValue={money}
        label="Revenue by channel"
        defaultSeries={channel}
        onSeriesChange={setChannel}
      />
    </div>
  );
}

export const WithDitherBar: Story = {
  parameters: { controls: { disable: true } },
  render: () => <RevenueWithBars />,
};

/** Three points and no chart: the summary says it all before anything plays. */
export const SingleShortSeries: Story = {
  args: {
    series: [{ key: "signups", label: "Sign-ups", values: [4, 9, 6] }],
    categories: ["Mon", "Tue", "Wed"],
    formatCategory: undefined,
    unit: { one: "sign-up", other: "sign-ups" },
    label: "Sign-ups this week",
    size: "sm",
  },
};
