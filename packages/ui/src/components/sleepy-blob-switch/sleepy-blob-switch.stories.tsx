import type { Meta, StoryObj } from "@storybook/react-vite";

import { SleepyBlobSwitch } from "./sleepy-blob-switch";

const meta = {
  title: "Form/Sleepy Blob Switch",
  component: SleepyBlobSwitch,
  args: { "aria-label": "Sleepy blob", size: "md" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof SleepyBlobSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip it. */
export const Default: Story = {};

/** On a stage, the way it was first shown. */
export const Stage: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-[#fbe3ee] px-10 py-12 text-[#4a2a3a]">
      <SleepyBlobSwitch size="lg" aria-label="Sleepy blob" />
      <p className="font-mono text-xs tracking-[0.3em] opacity-75">11 / 11</p>
      <h3 className="-mt-3 text-3xl font-bold tracking-tight">Sleepy Blob</h3>
      <span className="h-1 w-16 rounded-full bg-rose-400" />
    </div>
  ),
};

/** The sizes, off and on. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid items-center justify-items-center gap-6 sm:grid-cols-2">
      <SleepyBlobSwitch size="sm" aria-label="Small, off" />
      <SleepyBlobSwitch size="sm" aria-label="Small, on" defaultChecked />
      <SleepyBlobSwitch size="md" aria-label="Medium, off" />
      <SleepyBlobSwitch size="md" aria-label="Medium, on" defaultChecked />
    </div>
  ),
};
