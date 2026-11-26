import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { TideSwitch } from "./tide-switch";

const meta = {
  title: "Form/Tide Switch",
  component: TideSwitch,
  args: { "aria-label": "Tide", size: "md" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof TideSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip it. */
export const Default: Story = {};

function Scene() {
  const [on, setOn] = useState(false);
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-sky-950 px-10 py-12 text-white">
      <TideSwitch size="lg" aria-label="Tide" checked={on} onCheckedChange={setOn} />
      <p className="font-mono text-xs font-bold tracking-[0.3em] text-sky-200/70">06 / 11</p>
      <h3 className="-mt-3 text-3xl font-bold tracking-tight">Tide</h3>
      <span className="h-1 w-16 rounded-full bg-sky-400" />
    </div>
  );
}

/** On a stage, the way it was first shown. */
export const Stage: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Scene />,
};

/** The three sizes, off and on. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid items-center justify-items-center gap-6 sm:grid-cols-2">
      <TideSwitch size="sm" aria-label="Small, off" />
      <TideSwitch size="sm" aria-label="Small, on" defaultChecked />
      <TideSwitch size="md" aria-label="Medium, off" />
      <TideSwitch size="md" aria-label="Medium, on" defaultChecked />
      <TideSwitch size="lg" aria-label="Large, off" />
      <TideSwitch size="lg" aria-label="Large, on" defaultChecked />
    </div>
  ),
};
