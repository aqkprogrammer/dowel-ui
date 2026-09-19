import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { TimeStack, type TimeStackItem } from "./time-stack";

const items: TimeStackItem[] = [
  { label: "Today", title: "Sunset Beach", image: "https://picsum.photos/seed/beach/600/400" },
  {
    label: "1d ago",
    title: "Misty Mountains",
    image: "https://picsum.photos/seed/mountain/600/400",
  },
  {
    label: "1w ago",
    title: "Forest Trail",
    image: "https://picsum.photos/seed/forest/600/400",
  },
  {
    label: "1m ago",
    title: "Sunlight Woods",
    image: "https://picsum.photos/seed/woods/600/400",
  },
  { label: "1y ago", title: "Green Hills", image: "https://picsum.photos/seed/hills/600/400" },
];

const meta: Meta<typeof TimeStack> = {
  title: "Display/Time Stack",
  component: TimeStack,
  args: {
    items,
    "aria-label": "Snapshots",
    size: "md",
    tone: "media",
    wheel: true,
    hoverScrub: false,
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    tone: { control: "inline-radio", options: ["media", "mono"] },
    items: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every amicro stack this component covers, captioned with its source name. */
export const Gallery: Story = {
  render: () => (
    <div className="grid gap-8">
      {(
        [
          ["Time Machine Stack", { items, hoverScrub: true }],
          ["Time Machine Stack (Monochrome)", { items, hoverScrub: true, tone: "mono" }],
        ] as const
      ).map(([caption, props]) => (
        <figure key={caption} className="grid gap-2 rounded-2xl border border-border bg-card">
          <TimeStack aria-label={caption} size="sm" {...props} />
          <figcaption className="pb-3 text-center text-xs text-muted-foreground">
            {caption}
          </figcaption>
        </figure>
      ))}
    </div>
  ),
};

export const Controlled: Story = {
  render: (args) => {
    const [index, setIndex] = useState(2);
    return (
      <div className="grid gap-3">
        <TimeStack {...args} index={index} onIndexChange={setIndex} />
        <p className="text-center text-sm text-muted-foreground">
          Restoring from {items[index]?.label}
        </p>
      </div>
    );
  },
};

/** The scrubber sits at the inline end and its ticks grow from that side. */
export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl">
      <TimeStack {...args} aria-label="لقطات" scrubberLabel="الخط الزمني" />
    </div>
  ),
};
