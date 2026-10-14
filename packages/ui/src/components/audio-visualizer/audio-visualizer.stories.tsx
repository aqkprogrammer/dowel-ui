import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { AudioVisualizer } from "./audio-visualizer";

const meta = {
  title: "AI/Audio Visualizer",
  component: AudioVisualizer,
  args: { variant: "bars", level: 0.5, bands: 24 },
  argTypes: {
    variant: { control: "inline-radio", options: ["bars", "wave", "orb"] },
    level: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    bands: { control: { type: "range", min: 3, max: 64, step: 1 } },
    color: { control: "select", options: ["primary", "info", "success", "foreground"] },
    stream: { table: { disable: true } },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof AudioVisualizer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Driven by a level, as a speech SDK would supply it. Drag the level control. */
export const Default: Story = {};

/** A simulated voice: the level rises and falls like speech. */
export const Simulated: Story = {
  render: function Render(args) {
    const [level, setLevel] = useState(0);
    useEffect(() => {
      let t = 0;
      const id = window.setInterval(() => {
        t += 0.15;
        setLevel(Math.max(0, Math.sin(t) * 0.5 + Math.sin(t * 2.7) * 0.3 + 0.2));
      }, 80);
      return () => {
        window.clearInterval(id);
      };
    }, []);
    return (
      <div className="flex items-center gap-8">
        <AudioVisualizer {...args} variant="bars" level={level} label="Voice level" />
        <AudioVisualizer {...args} variant="wave" level={level} />
        <AudioVisualizer {...args} variant="orb" level={level} />
      </div>
    );
  },
};
