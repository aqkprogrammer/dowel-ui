import type { Meta, StoryObj } from "@storybook/react-vite";

import { AILoader } from "./ai-loader";

const meta: Meta<typeof AILoader> = {
  title: "AI/AI Loader",
  component: AILoader,
  args: { label: "Thinking", variant: "dots", size: "md", showElapsed: false },
  argTypes: {
    variant: { control: "inline-radio", options: ["dots", "bar", "grid"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** SmoothUI "AI Loader": the four rows of its demo, side by side so they stay in step. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <p className="text-xs text-muted-foreground">SmoothUI — AI Loader</p>
      <AILoader label="Thinking" variant="dots" />
      <AILoader label="Reading the export" variant="bar" />
      <AILoader label="Churning" showElapsed variant="grid" />
      <AILoader showElapsed variant="dots" />
    </div>
  ),
};
