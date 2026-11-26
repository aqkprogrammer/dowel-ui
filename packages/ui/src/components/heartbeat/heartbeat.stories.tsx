import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { Heartbeat } from "./heartbeat";

const meta = {
  title: "Data/Heartbeat",
  component: Heartbeat,
  args: { bpm: 72, size: "md", label: "Heart rate", unit: "bpm" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    bpm: { control: { type: "range", min: 40, max: 180, step: 1 } },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Heartbeat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** On a dark tile, as in the reference: one sweep and one thump per beat. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex flex-col items-center gap-6 rounded-3xl bg-[#161618] p-10 text-white">
      <Heartbeat bpm={72} />
      <span className="text-sm font-medium">Heartbeat</span>
    </div>
  ),
};

function Workout() {
  const [bpm, setBpm] = useState(72);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setBpm((current) => (current >= 150 ? 72 : current + 13));
    }, 2500);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  return <Heartbeat size="lg" bpm={bpm} />;
}

/** The tempo follows `bpm`. */
export const ChangingRate: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Workout />,
};

/** The accent follows the text colour. */
export const Accent: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-10">
      <Heartbeat className="text-destructive" bpm={96} />
      <Heartbeat className="text-success" bpm={58} />
    </div>
  ),
};
