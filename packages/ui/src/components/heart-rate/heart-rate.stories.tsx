import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { HeartRate } from "./heart-rate";

const meta = {
  title: "Data/Heart Rate",
  component: HeartRate,
  args: { bpm: 72, status: "normal", size: "md" },
  argTypes: {
    bpm: { control: { type: "range", min: 30, max: 200, step: 1 } },
    status: { control: "select", options: ["normal", "warning", "critical"] },
    size: { control: "select", options: ["sm", "md"] },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof HeartRate>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A resting pulse. Drag the bpm control: the rhythm changes on the next beat. */
export const Default: Story = {};

/** The three statuses; warning and critical add a word, not just a colour. */
export const Statuses: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-3">
      <HeartRate bpm={64} />
      <HeartRate bpm={118} status="warning" />
      <HeartRate bpm={162} status="critical" />
    </div>
  ),
};

function Workout() {
  const [bpm, setBpm] = useState(88);
  useEffect(() => {
    const timer = setInterval(() => {
      setBpm((value) =>
        Math.min(175, Math.max(80, value + Math.round((Math.random() - 0.35) * 9))),
      );
    }, 1500);
    return () => {
      clearInterval(timer);
    };
  }, []);
  const status = bpm > 160 ? "critical" : bpm > 130 ? "warning" : "normal";
  return <HeartRate bpm={bpm} status={status} label="Workout heart rate" />;
}

/** A live feed: the rate drifts every 1.5 s and the status follows it. */
export const Live: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Workout />,
};

/** The small size, for a dashboard tile. */
export const Small: Story = {
  args: { size: "sm", bpm: 58 },
};
