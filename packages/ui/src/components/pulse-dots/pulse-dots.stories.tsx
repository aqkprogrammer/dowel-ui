import type { Meta, StoryObj } from "@storybook/react-vite";

import { PulseDots } from "./pulse-dots";

const meta = {
  title: "Feedback/Pulse Dots",
  component: PulseDots,
  args: { size: "md", label: "Typing" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof PulseDots>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** As in the reference tile: three white dots on a dark tile. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex size-56 flex-col items-center justify-center gap-10 rounded-3xl bg-[#161618] p-10 text-white">
      <PulseDots size="lg" />
      <span className="text-sm font-medium">Pulse Dots</span>
    </div>
  ),
};

/** Inside a chat bubble, where it usually lives. */
export const InABubble: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="inline-flex rounded-2xl rounded-es-sm bg-muted px-4 py-3 text-muted-foreground">
      <PulseDots size="sm" label="Ana is typing" />
    </div>
  ),
};
