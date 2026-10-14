import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import { InteractiveGrid } from "./interactive-grid";

const meta = {
  title: "Effects/Interactive Grid",
  component: InteractiveGrid,
  args: {
    cell: 28,
    cellSize: 0.18,
    shape: "square",
    radius: 140,
    decay: 0.9,
    interactive: true,
    idle: false,
    fade: "none",
  },
  argTypes: {
    cell: { control: { type: "range", min: 12, max: 64, step: 2 } },
    cellSize: { control: { type: "range", min: 0.1, max: 1, step: 0.02 } },
    radius: { control: { type: "range", min: 40, max: 400, step: 10 } },
    decay: { control: { type: "range", min: 0.1, max: 0.99, step: 0.01 } },
    shape: { control: "inline-radio", options: ["square", "dot"] },
    accent: { control: "select", options: ["primary", "info", "success", "warning"] },
    fade: { control: "inline-radio", options: ["none", "edges", "bottom"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof InteractiveGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Move the pointer across it; press anywhere to send a ripple. */
export const Default: Story = {
  args: { fade: "edges" },
  render: (args) => (
    <InteractiveGrid {...args} className="min-h-[26rem] bg-background">
      <div className="flex min-h-[26rem] flex-col items-center justify-center gap-4 px-6 text-center">
        <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-balance text-foreground">
          An API that answers back
        </h2>
        <Button>Read the docs</Button>
      </div>
    </InteractiveGrid>
  ),
};

/** Dots that ripple now and then by themselves, in the info colour. */
export const IdleDots: Story = {
  args: { shape: "dot", idle: true, cellSize: 0.14, accent: "info", fade: "bottom" },
  render: (args) => <InteractiveGrid {...args} className="h-80 bg-background" />,
};
