import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProximityText } from "./proximity-text";

const meta = {
  title: "Effects/Proximity Text",
  component: ProximityText,
  args: { children: "Move closer", radius: 120, scale: 1.35, weight: 800, scope: "parent" },
  argTypes: {
    radius: { control: { type: "range", min: 30, max: 400, step: 10 } },
    scale: { control: { type: "range", min: 1, max: 2.5, step: 0.05 } },
    weight: { control: { type: "range", min: 100, max: 900, step: 100 } },
    accent: { control: "select", options: ["primary", "info", "warning", "success"] },
    scope: { control: "inline-radio", options: ["parent", "self"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ProximityText>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sweep the mouse anywhere over the section: the letters nearest it swell and tint. */
export const Default: Story = {
  render: (args) => (
    <section className="grid min-h-96 place-items-center bg-background">
      <ProximityText
        {...args}
        as="h2"
        className="text-6xl font-semibold tracking-tight text-foreground"
      />
    </section>
  ),
};
