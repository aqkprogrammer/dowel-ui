import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { BulgeVolume } from "./bulge-volume";

const meta = {
  title: "Form/Bulge Volume",
  component: BulgeVolume,
  args: { size: "md", defaultValue: 60 },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof BulgeVolume>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drag it, or focus it and use the arrow keys. */
export const Default: Story = {};

const LEVELS = [8, 30, 70, 100, 70, 30];

function DemoTile() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % LEVELS.length), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="dark flex size-48 flex-col items-center justify-center gap-6 rounded-3xl bg-[#161618] p-10 text-white">
      <BulgeVolume value={LEVELS[index]} onValueChange={() => {}} />
      <p className="text-sm font-medium">Bulge Volume</p>
    </div>
  );
}

/** Plays on its own, on a dark tile, the way the reference shows it. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => <DemoTile />,
};

/** The three sizes. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-end gap-8">
      <BulgeVolume size="sm" defaultValue={20} />
      <BulgeVolume size="md" defaultValue={0} />
      <BulgeVolume size="lg" defaultValue={85} />
    </div>
  ),
};
