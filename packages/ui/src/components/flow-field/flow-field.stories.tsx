import type { Meta, StoryObj } from "@storybook/react-vite";

import { FlowField } from "./flow-field";

const meta = {
  title: "Effects/Flow Field",
  component: FlowField,
  args: {
    density: 1,
    speed: 1,
    length: 10,
    thickness: 1,
    scale: 1,
    opacity: 0.55,
    interactive: true,
    fade: "none",
  },
  argTypes: {
    density: { control: { type: "range", min: 0, max: 3, step: 0.1 } },
    speed: { control: { type: "range", min: 0, max: 4, step: 0.25 } },
    length: { control: { type: "range", min: 2, max: 40, step: 1 } },
    scale: { control: { type: "range", min: 0.3, max: 3, step: 0.1 } },
    opacity: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    color: {
      control: "select",
      options: ["primary", "info", "foreground", "muted-foreground"],
    },
    fade: { control: "inline-radio", options: ["none", "edges", "bottom"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof FlowField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A data hero: move the pointer through the current to part it. */
export const Default: Story = {
  args: { fade: "edges" },
  render: (args) => (
    <FlowField {...args} className="min-h-[26rem] bg-background">
      <div className="flex min-h-[26rem] flex-col items-center justify-center gap-3 px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          Every event, as it happens
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Streaming analytics with sub-second freshness.
        </p>
      </div>
    </FlowField>
  ),
};

/** Long, broad, calm currents in the foreground colour — like a weather map. */
export const WeatherMap: Story = {
  args: {
    length: 28,
    scale: 2.2,
    speed: 0.6,
    density: 0.7,
    color: "foreground",
    opacity: 0.35,
  },
  render: (args) => <FlowField {...args} className="h-80 bg-background" />,
};
