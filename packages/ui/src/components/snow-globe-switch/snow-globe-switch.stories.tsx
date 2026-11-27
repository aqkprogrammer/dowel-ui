import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { SnowGlobeSwitch } from "./snow-globe-switch";

const meta = {
  title: "Form/Snow Globe Switch",
  component: SnowGlobeSwitch,
  args: { "aria-label": "Snow globe", size: "md" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof SnowGlobeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip it. */
export const Default: Story = {};

function Scene() {
  const [on, setOn] = useState(false);
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-stone-200 px-10 py-12 text-stone-900">
      <SnowGlobeSwitch size="lg" aria-label="Snow globe" checked={on} onCheckedChange={setOn} />
      <p className="font-mono text-xs font-bold tracking-[0.3em] text-stone-600">02 / 11</p>
      <h3 className="-mt-3 text-3xl font-bold tracking-tight">Snow Globe</h3>
      <span className="h-1 w-16 rounded-full bg-amber-400" />
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
      <SnowGlobeSwitch size="sm" aria-label="Small, off" />
      <SnowGlobeSwitch size="sm" aria-label="Small, on" defaultChecked />
      <SnowGlobeSwitch size="md" aria-label="Medium, off" />
      <SnowGlobeSwitch size="md" aria-label="Medium, on" defaultChecked />
      <SnowGlobeSwitch size="lg" aria-label="Large, off" />
      <SnowGlobeSwitch size="lg" aria-label="Large, on" defaultChecked />
    </div>
  ),
};
