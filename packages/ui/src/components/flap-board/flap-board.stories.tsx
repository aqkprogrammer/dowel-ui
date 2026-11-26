import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { FlapBoard } from "./flap-board";

const meta = {
  title: "Display/Flap Board",
  component: FlapBoard,
  args: { value: "BOARDING", size: "md", speed: 90, maxFlips: 10, stagger: 40 },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof FlapBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Change the value in the controls to watch the flaps turn. */
export const Default: Story = {};

const WORDS = ["BOARDING", "DELAYED", "ON TIME", "GATE 12", "DEPARTED"];

function Cycling() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), 2600);
    return () => clearInterval(timer);
  }, []);
  return <FlapBoard value={WORDS[index] ?? ""} length={8} size="lg" />;
}

/** Cycles through departure statuses every couple of seconds. */
export const Departures: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Cycling />,
};

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = now.toTimeString().slice(0, 8);
  return <FlapBoard value={time} size="lg" speed={60} maxFlips={3} />;
}

/** A clock, flipping each second. */
export const ClockFace: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Clock />,
};
