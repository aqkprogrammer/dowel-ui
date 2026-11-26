import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { QuantityStepper } from "./quantity-stepper";

const meta = {
  title: "Form/Quantity Stepper",
  component: QuantityStepper,
  args: { size: "md", defaultValue: 2, unitPrice: 24, min: 1, max: 9 },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof QuantityStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const SEQUENCE = [2, 3, 4, 3, 2];

function DemoTile() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SEQUENCE.length), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="dark flex size-48 flex-col items-center justify-center gap-6 rounded-3xl bg-[#161618] p-6 text-white">
      <QuantityStepper
        value={SEQUENCE[index]}
        unitPrice={24}
        min={1}
        onValueChange={() => {}}
      />
      <p className="text-sm font-medium">Quantity</p>
    </div>
  );
}

/**
 * Plays on its own, on a dark tile, the way the reference shows it. The timer
 * drives `value`, so the roll plays but the buttons do not flash; press them.
 */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => <DemoTile />,
};

/** Without a unit price there is no total. */
export const CountOnly: Story = { args: { unitPrice: undefined } };
