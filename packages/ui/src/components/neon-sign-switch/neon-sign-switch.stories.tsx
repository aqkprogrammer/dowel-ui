import type { Meta, StoryObj } from "@storybook/react-vite";

import { NeonSignSwitch } from "./neon-sign-switch";

const meta = {
  title: "Form/Neon Sign Switch",
  component: NeonSignSwitch,
  args: { "aria-label": "Neon sign", size: "md" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof NeonSignSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip it. */
export const Default: Story = {};

/** On a stage, the way it was first shown. */
export const Stage: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-[#2a1124] bg-[linear-gradient(transparent_23px,rgb(0_0_0/0.35)_24px),linear-gradient(90deg,transparent_47px,rgb(0_0_0/0.35)_48px)] bg-[size:48px_24px] px-10 py-12 text-white">
      <NeonSignSwitch size="lg" aria-label="Neon sign" />
      <p className="font-mono text-xs tracking-[0.3em] opacity-60">07 / 11</p>
      <h3 className="-mt-3 text-3xl font-bold tracking-tight">Neon Sign</h3>
      <span className="h-1 w-16 rounded-full bg-pink-500" />
    </div>
  ),
};

/** The sizes, off and on. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid items-center justify-items-center gap-6 sm:grid-cols-2">
      <NeonSignSwitch size="sm" aria-label="Small, off" />
      <NeonSignSwitch size="sm" aria-label="Small, on" defaultChecked />
      <NeonSignSwitch size="md" aria-label="Medium, off" />
      <NeonSignSwitch size="md" aria-label="Medium, on" defaultChecked />
    </div>
  ),
};
