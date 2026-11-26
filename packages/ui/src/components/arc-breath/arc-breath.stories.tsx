import type { Meta, StoryObj } from "@storybook/react-vite";

import { ArcBreath } from "./arc-breath";

const meta = {
  title: "Feedback/Arc Breath",
  component: ArcBreath,
  args: { size: "md", period: 2, label: "Loading" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof ArcBreath>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The arc grows and shrinks as it turns, on a two-second cycle. */
export const Default: Story = {};

/** As in the reference tile. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex w-64 flex-col items-center gap-10 rounded-3xl bg-[#161618] p-10 text-foreground">
      <ArcBreath />
      <span className="text-lg font-medium">Arc Breath</span>
    </div>
  ),
};

/** Three sizes. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      <ArcBreath size="sm" />
      <ArcBreath size="md" />
      <ArcBreath size="lg" />
    </div>
  ),
};
