import type { Meta, StoryObj } from "@storybook/react-vite";

import { OrigamiSwitch } from "./origami-switch";

const meta = {
  title: "Form/Origami Switch",
  component: OrigamiSwitch,
  args: { "aria-label": "Origami", size: "md" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof OrigamiSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip it. */
export const Default: Story = {};

/** On a stage, the way it was first shown. */
export const Stage: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-[#fbeee4] px-10 py-12 text-[#3b1d12]">
      <OrigamiSwitch size="lg" aria-label="Origami" />
      <p className="font-mono text-xs tracking-[0.3em] opacity-60">09 / 11</p>
      <h3 className="-mt-3 text-3xl font-bold tracking-tight">Origami</h3>
      <span className="h-1 w-16 rounded-full bg-orange-500" />
    </div>
  ),
};

/** The sizes, off and on. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid items-center justify-items-center gap-6 sm:grid-cols-2">
      <OrigamiSwitch size="sm" aria-label="Small, off" />
      <OrigamiSwitch size="sm" aria-label="Small, on" defaultChecked />
      <OrigamiSwitch size="md" aria-label="Medium, off" />
      <OrigamiSwitch size="md" aria-label="Medium, on" defaultChecked />
    </div>
  ),
};
