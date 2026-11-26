import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { StepTrack } from "./step-track";

const meta = {
  title: "Navigation/Step Track",
  component: StepTrack,
  args: { size: "md", steps: 4, defaultValue: 1 },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof StepTrack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const SEQUENCE = [1, 2, 3, 2, 1, 2];

function DemoTile() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SEQUENCE.length), 700);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="dark flex size-48 flex-col items-center justify-center gap-8 rounded-3xl bg-[#161618] p-6 text-white">
      <StepTrack value={SEQUENCE[index]} onValueChange={() => {}} />
      <p className="text-sm font-medium">Step Track</p>
    </div>
  );
}

/** Plays on its own, on a dark tile, the way the reference shows it. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => <DemoTile />,
};

/** Named steps, announced as "Step 2 of 4: Shipping". */
export const Labelled: Story = {
  args: { steps: ["Cart", "Shipping", "Payment", "Review"], "aria-label": "Checkout" },
};
