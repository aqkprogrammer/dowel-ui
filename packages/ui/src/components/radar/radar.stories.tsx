import type { Meta, StoryObj } from "@storybook/react-vite";

import { Radar } from "./radar";

const meta = {
  title: "Effects/Radar",
  component: Radar,
  args: { size: "md" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Radar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Decorative: three rings, three blips, a two-second turn. */
export const Default: Story = {};

/** On a dark tile, the way the reference shows it. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex size-64 items-center justify-center rounded-3xl bg-[#161618] p-10 text-white">
      <Radar size="md" />
    </div>
  ),
};

/** Named, with a status in text beside it. */
export const WithStatus: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-3">
      <Radar label="Scanning for nearby devices" size="lg" />
      <p role="status" className="text-sm text-muted-foreground">
        Searching for devices…
      </p>
    </div>
  ),
};

/** A slower scope with its own blips and more rings, tinted by the text colour. */
export const Custom: Story = {
  args: {
    period: 4000,
    rings: 4,
    className: "text-primary",
    blips: [
      { angle: 20, distance: 0.3 },
      { angle: 95, distance: 0.8 },
      { angle: 200, distance: 0.55 },
      { angle: 300, distance: 0.4 },
    ],
  },
};
