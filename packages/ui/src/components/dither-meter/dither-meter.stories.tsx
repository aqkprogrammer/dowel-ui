import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DitherMeter, type DitherMeterSegment } from "./dither-meter";

/** amicro's three storage views: used of total, in GB. */
const VIEWS = [
  { name: "Database", total: 500, used: 340 },
  { name: "Assets", total: 1000, used: 850 },
  { name: "Backups", total: 2000, used: 450 },
];

const gb = (value: number) => `${new Intl.NumberFormat().format(value)} GB`;

const CATEGORIES: DitherMeterSegment[] = [
  { key: "db", label: "Database", value: 340 },
  { key: "assets", label: "Assets", value: 850 },
  { key: "backups", label: "Backups", value: 450 },
];

const meta: Meta<typeof DitherMeter> = {
  title: "Data/Dither Meter",
  component: DitherMeter,
  args: {
    segments: CATEGORIES,
    max: 3500,
    label: "Storage used",
    formatValue: gb,
    size: "md",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    segments: { control: false },
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

/** amicro's Storage Capacity Bar: one volume at a time, switched by view. */
function StorageCapacity() {
  const [view, setView] = useState(0);
  const current = VIEWS[view] ?? VIEWS[0]!;
  return (
    <div className="flex max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <div
        role="group"
        aria-label="Volume"
        className="inline-flex self-start rounded-full border border-border bg-muted p-0.5 text-xs"
      >
        {VIEWS.map((v, index) => (
          <button
            key={v.name}
            type="button"
            aria-pressed={view === index}
            onClick={() => {
              setView(index);
            }}
            className="rounded-full px-2.5 py-1 font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:outline-none aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {v.name}
          </button>
        ))}
      </div>
      <DitherMeter
        segments={[{ key: "used", label: "Used", value: current.used }]}
        max={current.total}
        label={`${current.name} storage`}
        formatValue={gb}
        showLegend={false}
      />
    </div>
  );
}

export const StorageCapacityBar: Story = {
  parameters: { controls: { disable: true } },
  render: () => <StorageCapacity />,
};

/** Every amicro source item this component covers. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-8">
      <figure className="flex flex-col gap-2">
        <StorageCapacity />
        <figcaption className="text-xs text-muted-foreground">Storage Capacity Bar</figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground">
          <DitherMeter segments={CATEGORIES} max={3500} label="Storage used" formatValue={gb} />
        </div>
        <figcaption className="text-xs text-muted-foreground">
          Storage Capacity Bar (all three views as segments of one volume)
        </figcaption>
      </figure>
    </div>
  ),
};

export const PinnedCategory: Story = {
  args: { defaultActiveSegment: "assets" },
};

export const WithVisibleTable: Story = {
  args: { showTable: true },
};

export const Static: Story = {
  args: { animate: false },
};
