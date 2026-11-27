import type { Meta, StoryObj } from "@storybook/react-vite";

import { ReactorSwitch } from "./reactor-switch";

const meta = {
  title: "Form/Reactor Switch",
  component: ReactorSwitch,
  args: { "aria-label": "Reactor", size: "md", readout: false },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof ReactorSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip it: the core slides over, charges and lights cell by cell. */
export const Default: Story = {};

/** With the charge readout counting above the track. */
export const Readout: Story = {
  args: { readout: true },
};

/** On a dark stage, the way it was first shown. */
export const Stage: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex flex-col items-center gap-5 rounded-2xl bg-neutral-950 px-10 py-12 text-white">
      <ReactorSwitch size="lg" aria-label="Reactor" readout />
      <h3 className="text-3xl font-bold tracking-tight">Reactor</h3>
      <span className="h-1 w-16 rounded-full bg-cyan-400" />
    </div>
  ),
};

/** The three sizes, off and on. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid items-center justify-items-center gap-6 sm:grid-cols-2">
      <ReactorSwitch size="sm" aria-label="Small, off" />
      <ReactorSwitch size="sm" aria-label="Small, on" defaultChecked />
      <ReactorSwitch size="md" aria-label="Medium, off" />
      <ReactorSwitch size="md" aria-label="Medium, on" defaultChecked />
    </div>
  ),
};
