import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DitherFunnel, type DitherFunnelStage } from "./dither-funnel";

/** amicro's two quarterly funnels. */
const PERIODS: { name: string; stages: DitherFunnelStage[] }[] = [
  {
    name: "Q1 Funnel",
    stages: [
      { label: "Visitors", value: 100 },
      { label: "Leads", value: 62 },
      { label: "Deals", value: 38 },
      { label: "Won", value: 18 },
    ],
  },
  {
    name: "Q2 Funnel",
    stages: [
      { label: "Visitors", value: 100 },
      { label: "Leads", value: 74 },
      { label: "Deals", value: 45 },
      { label: "Won", value: 24 },
    ],
  },
];

const meta: Meta<typeof DitherFunnel> = {
  title: "Data/Dither Funnel",
  component: DitherFunnel,
  args: { stages: PERIODS[0]!.stages, label: "Sales funnel", size: "md" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    stages: { control: false },
    formatValue: { control: false },
    formatPercent: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** amicro's Conversion Funnel, switched between quarters. */
function ConversionFunnel() {
  const [period, setPeriod] = useState(0);
  const current = PERIODS[period] ?? PERIODS[0]!;
  return (
    <div className="flex max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <div
        role="group"
        aria-label="Quarter"
        className="inline-flex self-end rounded-full border border-border bg-muted p-0.5 text-xs"
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
      <DitherFunnel stages={current.stages} label={`Conversion, ${current.name}`} />
    </div>
  );
}

export const ConversionFunnelStory: Story = {
  name: "Conversion Funnel",
  parameters: { controls: { disable: true } },
  render: () => <ConversionFunnel />,
};

/** Every amicro source item this component covers. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col gap-2">
      <ConversionFunnel />
      <figcaption className="text-xs text-muted-foreground">Conversion Funnel</figcaption>
    </figure>
  ),
};

export const PinnedStage: Story = {
  args: { defaultActiveStage: 2 },
};

export const WithVisibleTable: Story = {
  args: { showTable: true },
};

export const Static: Story = {
  args: { animate: false },
};
