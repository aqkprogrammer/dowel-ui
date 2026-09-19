import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DitherGauge, type DitherGaugeMetric } from "./dither-gauge";

/** amicro's three server metrics and their base readings. */
const METRICS: DitherGaugeMetric[] = [
  { key: "cpu", label: "CPU Load", value: 65 },
  { key: "memory", label: "Memory", value: 82 },
  { key: "network", label: "Network", value: 45 },
];

const meta: Meta<typeof DitherGauge> = {
  title: "Data/Dither Gauge",
  component: DitherGauge,
  args: { metrics: METRICS.slice(0, 2), label: "Server load", size: "md" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    metrics: { control: false },
    formatValue: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** amicro's Server CPU Gauge: one dial, switched between CPU, memory and network. */
function ServerGauge() {
  const [metric, setMetric] = useState(0);
  const shown = METRICS[metric] ?? METRICS[0]!;
  return (
    <div className="flex w-72 flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <div
        role="group"
        aria-label="Metric"
        className="inline-flex self-center rounded-full border border-border bg-muted p-0.5 text-xs"
      >
        {METRICS.map((m, index) => (
          <button
            key={m.key}
            type="button"
            aria-pressed={metric === index}
            onClick={() => {
              setMetric(index);
            }}
            className="rounded-full px-2.5 py-1 font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:outline-none aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {m.label}
          </button>
        ))}
      </div>
      {/* One metric: the gauge keeps the ring and sweeps it to the new reading. */}
      <DitherGauge metrics={[{ ...shown, key: "reading" }]} label="Server CPU gauge" />
    </div>
  );
}

export const ServerCpuGauge: Story = {
  parameters: { controls: { disable: true } },
  render: () => <ServerGauge />,
};

/** Every amicro source item this component covers. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap gap-8">
      <figure className="flex flex-col gap-2">
        <ServerGauge />
        <figcaption className="text-xs text-muted-foreground">Server CPU Gauge</figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <div className="w-72 rounded-2xl border border-border bg-card p-6 text-card-foreground">
          <DitherGauge metrics={METRICS} label="Server CPU, memory and network" />
        </div>
        <figcaption className="text-xs text-muted-foreground">
          Server CPU Gauge (all three metrics as rings)
        </figcaption>
      </figure>
    </div>
  ),
};

export const Units: Story = {
  args: {
    metrics: [{ key: "memory", label: "Memory", value: 12.4, max: 16 }],
    formatValue: (value: number) => `${value.toFixed(1)} GB`,
  },
};

export const WithVisibleTable: Story = {
  args: { showTable: true },
};

export const Static: Story = {
  args: { animate: false },
};
