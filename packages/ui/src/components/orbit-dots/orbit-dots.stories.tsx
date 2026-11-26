import type { Meta, StoryObj } from "@storybook/react-vite";

import { OrbitDots } from "./orbit-dots";

const meta = {
  title: "Feedback/Orbit Dots",
  component: OrbitDots,
  args: { size: "md", label: "Loading", speed: 1 },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof OrbitDots>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** On a dark tile, as in the reference. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex flex-col items-center gap-6 rounded-3xl bg-[#161618] p-10 text-white">
      <OrbitDots size="md" />
      <span className="text-sm font-medium">Orbit</span>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      <OrbitDots size="sm" />
      <OrbitDots size="md" />
      <OrbitDots size="lg" />
    </div>
  ),
};

/** Colour follows the text it sits in. */
export const InheritsColour: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      <OrbitDots className="text-primary" />
      <OrbitDots className="text-muted-foreground" />
    </div>
  ),
};
