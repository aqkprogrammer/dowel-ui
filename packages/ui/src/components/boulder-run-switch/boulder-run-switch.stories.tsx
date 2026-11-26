import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { BoulderRunSwitch } from "./boulder-run-switch";

const meta = {
  title: "Form/Boulder Run Switch",
  component: BoulderRunSwitch,
  args: { "aria-label": "Boulder run", size: "md" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof BoulderRunSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip it: the boulder rolls and the explorer runs for it. */
export const Default: Story = {};

function Scene() {
  const [on, setOn] = useState(false);
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-neutral-950 px-10 py-12 text-amber-50">
      <p className="flex items-center gap-3 font-mono text-xs tracking-[0.3em] uppercase">
        <span className="h-3 w-7 bg-[repeating-linear-gradient(135deg,currentColor_0_4px,transparent_4px_8px)]" />
        <span className="font-bold text-amber-400">Scene 1</span>
        <span className="text-amber-50/60">{on ? "The escape" : "The idol"}</span>
      </p>
      <BoulderRunSwitch
        size="lg"
        aria-label="Boulder run"
        checked={on}
        onCheckedChange={setOn}
      />
      <h3 className="text-3xl font-bold tracking-tight">Boulder Run</h3>
      <span className="h-1 w-16 rounded-full bg-amber-400" />
    </div>
  );
}

/** On a dark stage with a slate, the way it was first shown. */
export const Stage: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Scene />,
};

/** The three sizes, off and on. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid items-center justify-items-center gap-6 sm:grid-cols-2">
      <BoulderRunSwitch size="sm" aria-label="Small, off" />
      <BoulderRunSwitch size="sm" aria-label="Small, on" defaultChecked />
      <BoulderRunSwitch size="md" aria-label="Medium, off" />
      <BoulderRunSwitch size="md" aria-label="Medium, on" defaultChecked />
    </div>
  ),
};
