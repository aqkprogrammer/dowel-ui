import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { LiquidToggle } from "./liquid-toggle";

const meta = {
  title: "Form/Liquid Toggle",
  component: LiquidToggle,
  args: {
    "aria-label": "Liquid toggle",
    speed: 50,
    stretch: 36,
    size: "md",
    stroke: true,
  },
  argTypes: {
    speed: { control: { type: "range", min: 0, max: 100, step: 5 } },
    stretch: { control: { type: "range", min: 0, max: 100, step: 5 } },
    size: { control: "select", options: ["sm", "md"] },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof LiquidToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tap it, or drag the knob across and let go. */
export const Default: Story = {};

function Labelled() {
  const [on, setOn] = useState(false);
  return (
    <label className="flex items-center gap-3 text-sm">
      <LiquidToggle checked={on} onCheckedChange={setOn} size="sm" />
      Airplane mode {on ? "on" : "off"}
    </label>
  );
}

/** bencho "Liquid toggle" at its defaults (Speed 50, Stretch 36), stiff and rigid, and stroke off. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 rounded-xl bg-muted p-10">
      <figure className="flex flex-col items-center gap-2">
        <LiquidToggle aria-label="Liquid toggle" />
        <figcaption className="text-xs text-muted-foreground">bencho Liquid toggle</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <LiquidToggle aria-label="Fast and rigid" speed={100} stretch={0} defaultChecked />
        <figcaption className="text-xs text-muted-foreground">Speed 100 · Stretch 0</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <LiquidToggle aria-label="Slow and gooey" speed={10} stretch={100} stroke={false} />
        <figcaption className="text-xs text-muted-foreground">
          Speed 10 · Stretch 100 · Stroke off
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <Labelled />
        <figcaption className="text-xs text-muted-foreground">Small, with a label</figcaption>
      </figure>
    </div>
  ),
};
