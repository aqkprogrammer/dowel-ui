import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { RangeDial, type RangeDialProps, type RangeDialValue } from "./range-dial";

const meta = {
  title: "Form/Range Dial",
  component: RangeDial,
  args: {
    "aria-label": "Sleep window",
    snap: 15,
    density: 48,
    reach: 56,
  },
  argTypes: {
    snap: { control: "inline-radio", options: [5, 15, 30] },
    density: { control: { type: "range", min: 24, max: 96, step: 8 } },
    reach: { control: { type: "range", min: 44, max: 68, step: 1 } },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof RangeDial>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const FEELS: { caption: string; props: Partial<RangeDialProps> }[] = [
  { caption: "bencho Range dial", props: {} },
  { caption: "bencho Range dial · Snap 5", props: { snap: 5 } },
  { caption: "bencho Range dial · Snap 30", props: { snap: 30 } },
  { caption: "bencho Range dial · Density 24", props: { density: 24 } },
  { caption: "bencho Range dial · Density 96", props: { density: 96 } },
  { caption: "bencho Range dial · Reach 44", props: { reach: 44 } },
  { caption: "bencho Range dial · Reach 68", props: { reach: 68 } },
];

/** The source block and each of its feel controls (Snap, Density, Reach). */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-10 rounded-xl bg-muted p-8">
      {FEELS.map(({ caption, props }) => (
        <figure key={caption} className="flex flex-col items-center gap-3">
          <RangeDial aria-label={`Sleep window (${caption})`} className="w-56" {...props} />
          <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
        </figure>
      ))}
    </div>
  ),
};

function ControlledDial() {
  const [value, setValue] = useState<RangeDialValue>([22 * 60 + 30, 7 * 60]);
  const time = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return (
    <div className="flex flex-col items-center gap-4">
      <RangeDial aria-label="Sleep window" value={value} onValueChange={setValue} />
      <p className="text-sm text-muted-foreground tabular-nums">
        {time(value[0])} → {time(value[1])}
      </p>
    </div>
  );
}

/** Controlled: the times below follow the dial. */
export const Controlled: Story = {
  render: () => <ControlledDial />,
};

/** Thumb names and a 24-hour valuetext for a non-sleep use. */
export const QuietHours: Story = {
  args: {
    "aria-label": "Quiet hours",
    thumbLabels: ["Quiet from", "Quiet until"],
    locale: "en-GB",
    defaultValue: [20 * 60, 8 * 60],
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
