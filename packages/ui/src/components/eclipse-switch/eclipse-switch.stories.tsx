import type { Meta, StoryObj } from "@storybook/react-vite";

import { EclipseSwitch } from "./eclipse-switch";

const meta = {
  title: "Form/Eclipse Switch",
  component: EclipseSwitch,
  args: { "aria-label": "Eclipse", size: "md" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof EclipseSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip it. */
export const Default: Story = {};

/** On a stage, the way it was first shown. */
export const Stage: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-slate-950 px-10 py-12 text-white">
      <EclipseSwitch size="lg" aria-label="Eclipse" />
      <p className="font-mono text-xs tracking-[0.3em] opacity-60">10 / 11</p>
      <h3 className="-mt-3 text-3xl font-bold tracking-tight">Eclipse</h3>
      <span className="h-1 w-16 rounded-full bg-amber-400" />
    </div>
  ),
};

/** The sizes, off and on. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid items-center justify-items-center gap-6 sm:grid-cols-2">
      <EclipseSwitch size="sm" aria-label="Small, off" />
      <EclipseSwitch size="sm" aria-label="Small, on" defaultChecked />
      <EclipseSwitch size="md" aria-label="Medium, off" />
      <EclipseSwitch size="md" aria-label="Medium, on" defaultChecked />
    </div>
  ),
};
