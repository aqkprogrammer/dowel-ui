import type { Meta, StoryObj } from "@storybook/react-vite";

import { BreathOrb } from "./breath-orb";

const meta = {
  title: "Effects/Breath Orb",
  component: BreathOrb,
  args: { size: "md", duration: 2, paused: false },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof BreathOrb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** On a dark tile, the way the reference shows it. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex size-48 flex-col items-center justify-center gap-5 rounded-3xl bg-[#161618] p-10 text-white">
      <BreathOrb size="sm" />
      <p className="text-sm font-medium">Breath Orb</p>
    </div>
  ),
};

/** A slow, named breath for a breathing exercise. */
export const Exercise: Story = {
  args: { duration: 8, label: "Breathe in as the orb grows, out as it shrinks", size: "lg" },
};
