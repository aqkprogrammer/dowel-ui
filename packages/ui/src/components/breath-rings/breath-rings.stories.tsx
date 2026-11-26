import type { Meta, StoryObj } from "@storybook/react-vite";

import { BreathRings } from "./breath-rings";

const meta = {
  title: "Feedback/Breath Rings",
  component: BreathRings,
  args: { size: "md", period: 2 },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof BreathRings>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The dot and rings breathe on a two-second loop. */
export const Default: Story = {};

/** As in the reference tile: on a dark card, with its label. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex w-64 flex-col items-center gap-10 rounded-3xl bg-[#161618] p-10 text-white">
      <BreathRings label="Listening" className="text-white" />
      <span className="text-lg font-medium">Breath Rings</span>
    </div>
  ),
};

/** Three sizes. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      <BreathRings size="sm" />
      <BreathRings size="md" />
      <BreathRings size="lg" />
    </div>
  ),
};
