import type { Meta, StoryObj } from "@storybook/react-vite";

import { RingDots } from "./ring-dots";

const meta = {
  title: "Feedback/Ring Dots",
  component: RingDots,
  args: { size: "md", label: "Loading" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof RingDots>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** On a dark tile, the way the reference shows it. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex size-48 flex-col items-center justify-center gap-6 rounded-3xl bg-[#161618] p-10 text-white">
      <RingDots size="md" className="text-foreground" />
      <p className="text-sm font-medium">Ring Dots</p>
    </div>
  ),
};

/** The three sizes, and a coloured one. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      <RingDots size="sm" />
      <RingDots size="md" />
      <RingDots size="lg" className="text-primary" />
    </div>
  ),
};
