import type { Meta, StoryObj } from "@storybook/react-vite";

import { GradientText } from "./gradient-text";

const meta = {
  title: "Effects/Gradient Text",
  component: GradientText,
  args: { animate: true, angle: 90, duration: 6 },
  argTypes: {
    angle: { control: { type: "range", min: 0, max: 360, step: 5 } },
    duration: { control: { type: "range", min: 1, max: 20, step: 0.5 } },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof GradientText>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One phrase of a hero heading in the brand colours, drifting slowly. */
export const Default: Story = {
  render: (args) => (
    <h2 className="max-w-xl text-center text-5xl font-semibold tracking-tight text-foreground">
      Build interfaces that <GradientText {...args}>feel alive</GradientText>
    </h2>
  ),
};

/** Warm and still: a stat that needs emphasis. */
export const Warm: Story = {
  args: { colors: ["warning", "destructive"], animate: false, angle: 120 },
  render: (args) => (
    <p className="text-6xl font-bold tabular-nums">
      <GradientText {...args}>+248%</GradientText>
    </p>
  ),
};
