import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { NotchSlider } from "./notch-slider";

const meta = {
  title: "Form/Notch Slider",
  component: NotchSlider,
  args: { size: "md", defaultValue: "S" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof NotchSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const SEQUENCE = ["S", "L", "XL", "XL", "M", "S"];

function DemoTile() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SEQUENCE.length), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="dark flex size-48 flex-col items-center justify-center gap-8 rounded-3xl bg-[#161618] p-6 text-white">
      <NotchSlider value={SEQUENCE[index]} onValueChange={() => {}} />
      <p className="text-sm font-medium">Notch Slider</p>
    </div>
  );
}

/** Plays on its own, on a dark tile, the way the reference shows it. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => <DemoTile />,
};

/** Spoken names for abbreviated labels. */
export const SpokenNames: Story = {
  args: {
    "aria-label": "Shirt size",
    optionLabels: ["Extra small", "Small", "Medium", "Large", "Extra large"],
    size: "lg",
  },
};
