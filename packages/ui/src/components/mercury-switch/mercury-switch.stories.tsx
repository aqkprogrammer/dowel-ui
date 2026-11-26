import type { Meta, StoryObj } from "@storybook/react-vite";

import { MercurySwitch } from "./mercury-switch";

const meta = {
  title: "Form/Mercury Switch",
  component: MercurySwitch,
  args: { "aria-label": "Mercury", size: "md" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof MercurySwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip it. */
export const Default: Story = {};

/** On a stage, the way it was first shown. */
export const Stage: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-neutral-950 px-10 py-12 text-white">
      <MercurySwitch size="lg" aria-label="Mercury" />
      <p className="font-mono text-xs tracking-[0.3em] opacity-60">03 / 11</p>
      <h3 className="-mt-3 text-3xl font-bold tracking-tight">Mercury</h3>
      <span className="h-1 w-16 rounded-full bg-sky-400" />
    </div>
  ),
};

/** The sizes, off and on. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid items-center justify-items-center gap-6 sm:grid-cols-2">
      <MercurySwitch size="sm" aria-label="Small, off" />
      <MercurySwitch size="sm" aria-label="Small, on" defaultChecked />
      <MercurySwitch size="md" aria-label="Medium, off" />
      <MercurySwitch size="md" aria-label="Medium, on" defaultChecked />
    </div>
  ),
};
