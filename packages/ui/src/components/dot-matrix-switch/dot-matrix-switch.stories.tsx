import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DotMatrixSwitch } from "./dot-matrix-switch";

const meta = {
  title: "Form/Dot Matrix Switch",
  component: DotMatrixSwitch,
  args: { "aria-label": "Dot matrix", size: "md" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof DotMatrixSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip it. */
export const Default: Story = {};

function Scene() {
  const [on, setOn] = useState(false);
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-[#241f2b] px-10 py-12 text-white">
      <DotMatrixSwitch size="lg" aria-label="Dot matrix" checked={on} onCheckedChange={setOn} />
      <p className="font-mono text-xs font-bold tracking-[0.3em] text-white/50">04 / 11</p>
      <h3 className="-mt-3 text-3xl font-bold tracking-tight">Dot Matrix</h3>
      <span className="h-1 w-16 rounded-full bg-orange-400" />
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
      <DotMatrixSwitch size="sm" aria-label="Small, off" />
      <DotMatrixSwitch size="sm" aria-label="Small, on" defaultChecked />
      <DotMatrixSwitch size="md" aria-label="Medium, off" />
      <DotMatrixSwitch size="md" aria-label="Medium, on" defaultChecked />
      <DotMatrixSwitch size="lg" aria-label="Large, off" />
      <DotMatrixSwitch size="lg" aria-label="Large, on" defaultChecked />
    </div>
  ),
};
