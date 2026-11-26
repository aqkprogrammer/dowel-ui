import type { Meta, StoryObj } from "@storybook/react-vite";

import { SymbioteSwitch } from "./symbiote-switch";

const meta = {
  title: "Form/Symbiote Switch",
  component: SymbioteSwitch,
  args: { "aria-label": "Symbiote", size: "md" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof SymbioteSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip it. */
export const Default: Story = {};

/** On a stage, the way it was first shown. */
export const Stage: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-neutral-950 px-10 py-12 text-white">
      <SymbioteSwitch size="lg" aria-label="Symbiote" />
      <p className="font-mono text-xs tracking-[0.3em] opacity-60">01 / 11</p>
      <h3 className="-mt-3 text-3xl font-bold tracking-tight">Symbiote</h3>
      <span className="h-1 w-16 rounded-full bg-violet-400" />
    </div>
  ),
};

/** The sizes, off and on. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid items-center justify-items-center gap-6 sm:grid-cols-2">
      <SymbioteSwitch size="sm" aria-label="Small, off" />
      <SymbioteSwitch size="sm" aria-label="Small, on" defaultChecked />
      <SymbioteSwitch size="md" aria-label="Medium, off" />
      <SymbioteSwitch size="md" aria-label="Medium, on" defaultChecked />
    </div>
  ),
};
