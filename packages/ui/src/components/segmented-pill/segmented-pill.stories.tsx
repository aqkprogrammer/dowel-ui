import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { SegmentedPill } from "./segmented-pill";

const meta = {
  title: "Form/Segmented Pill",
  component: SegmentedPill,
  args: { "aria-label": "Range", size: "md" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof SegmentedPill>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click a segment or use the arrow keys: the thumb slides and stretches. */
export const Default: Story = {};

const SEQUENCE = ["Week", "Month", "Day", "Week", "Month", "Day"];

function TileDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setStep((value) => (value + 1) % SEQUENCE.length);
    }, 750);
    return () => {
      clearInterval(id);
    };
  }, []);
  return (
    <div className="dark flex w-64 flex-col items-center gap-10 rounded-3xl bg-[#161618] p-10 text-foreground">
      <SegmentedPill aria-label="Range" value={SEQUENCE[step]} />
      <span className="text-lg font-medium">Segmented</span>
    </div>
  );
}

/** Plays itself, as in the reference tile. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => <TileDemo />,
};
